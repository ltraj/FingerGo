// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

package storage

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	domain "github.com/AshBuk/FingerGo/internal/domain"
)

const (
	practiceGroupsVersion = 1
	maxPracticeGroups    = 20
	maxKeysPerGroup      = 30
	maxPracticeGroupName = 64
)

// Practice group validation errors.
var (
	ErrPracticeGroupNotFound = errors.New("storage: practice group not found")
	ErrPracticeGroupExists   = errors.New("storage: practice group already exists")
	ErrTooManyPracticeGroups = errors.New("storage: too many practice groups")
	ErrEmptyPracticeGroupName = errors.New("storage: practice group name is empty")
	ErrPracticeGroupNameTooLong = errors.New("storage: practice group name too long")
	ErrEmptyPracticeKeys     = errors.New("storage: practice group keys are empty")
	ErrTooManyPracticeKeys   = errors.New("storage: too many keys in practice group")
	ErrInvalidPracticeKey    = errors.New("storage: invalid practice key")
)

// PracticeGroupRepository persists custom practice groups.
type PracticeGroupRepository struct {
	storage *Manager
	store   domain.PracticeGroupStore
	loaded  bool
}

// NewPracticeGroupRepository wires the repository to the storage manager.
func NewPracticeGroupRepository(mgr *Manager) (*PracticeGroupRepository, error) {
	if mgr == nil {
		return nil, errNilManager
	}
	return &PracticeGroupRepository{storage: mgr}, nil
}

// List returns all custom practice groups.
func (r *PracticeGroupRepository) List() ([]domain.PracticeGroup, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}
	out := make([]domain.PracticeGroup, len(r.store.Groups))
	copy(out, r.store.Groups)
	return out, nil
}

// Save creates or updates a practice group.
func (r *PracticeGroupRepository) Save(group *domain.PracticeGroup) (domain.PracticeGroup, error) {
	if err := r.ensureLoaded(); err != nil {
		return domain.PracticeGroup{}, err
	}
	if group == nil {
		return domain.PracticeGroup{}, ErrEmptyPracticeGroupName
	}
	normalized, err := validatePracticeGroup(*group)
	if err != nil {
		return domain.PracticeGroup{}, err
	}
	now := time.Now().UTC()
	if normalized.ID == "" {
		normalized.ID = uuid.NewString()
		normalized.CreatedAt = now
		if len(r.store.Groups) >= maxPracticeGroups {
			return domain.PracticeGroup{}, ErrTooManyPracticeGroups
		}
		normalized.UpdatedAt = now
		r.store.Groups = append(r.store.Groups, normalized)
	} else {
		if err := validateTextID(normalized.ID); err != nil {
			return domain.PracticeGroup{}, err
		}
		idx := -1
		for i, g := range r.store.Groups {
			if g.ID == normalized.ID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return domain.PracticeGroup{}, ErrPracticeGroupNotFound
		}
		normalized.CreatedAt = r.store.Groups[idx].CreatedAt
		if normalized.CreatedAt.IsZero() {
			normalized.CreatedAt = now
		}
		normalized.UpdatedAt = now
		r.store.Groups[idx] = normalized
	}
	if err := r.persist(); err != nil {
		return domain.PracticeGroup{}, err
	}
	return normalized, nil
}

// Delete removes a practice group by ID.
func (r *PracticeGroupRepository) Delete(id string) error {
	if err := validateTextID(id); err != nil {
		return err
	}
	if err := r.ensureLoaded(); err != nil {
		return err
	}
	idx := -1
	for i, g := range r.store.Groups {
		if g.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return ErrPracticeGroupNotFound
	}
	r.store.Groups = append(r.store.Groups[:idx], r.store.Groups[idx+1:]...)
	return r.persist()
}

func validatePracticeGroup(group domain.PracticeGroup) (domain.PracticeGroup, error) {
	name := strings.TrimSpace(group.Name)
	if name == "" {
		return domain.PracticeGroup{}, ErrEmptyPracticeGroupName
	}
	if utf8.RuneCountInString(name) > maxPracticeGroupName {
		return domain.PracticeGroup{}, ErrPracticeGroupNameTooLong
	}
	layoutID := strings.TrimSpace(group.LayoutID)
	if layoutID == "" {
		layoutID = "en-qwerty"
	}
	if err := validateTextID(layoutID); err != nil {
		return domain.PracticeGroup{}, fmt.Errorf("%w: invalid layout id", ErrInvalidPracticeKey)
	}
	keys, err := normalizePracticeKeys(group.Keys)
	if err != nil {
		return domain.PracticeGroup{}, err
	}
	return domain.PracticeGroup{
		ID:       strings.TrimSpace(group.ID),
		Name:     name,
		LayoutID: layoutID,
		Keys:     keys,
	}, nil
}

func normalizePracticeKeys(keys []string) ([]string, error) {
	if len(keys) == 0 {
		return nil, ErrEmptyPracticeKeys
	}
	if len(keys) > maxKeysPerGroup {
		return nil, ErrTooManyPracticeKeys
	}
	seen := make(map[string]struct{}, len(keys))
	out := make([]string, 0, len(keys))
	for _, raw := range keys {
		k := strings.TrimSpace(raw)
		if k == "" {
			continue
		}
		if err := validatePracticeKey(k); err != nil {
			return nil, err
		}
		if _, dup := seen[k]; dup {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, k)
	}
	if len(out) == 0 {
		return nil, ErrEmptyPracticeKeys
	}
	return out, nil
}

func validatePracticeKey(key string) error {
	if key == " " {
		return nil
	}
	if len(key) > 12 {
		return fmt.Errorf("%w: %q", ErrInvalidPracticeKey, key)
	}
	disallowed := map[string]struct{}{
		"Tab": {}, "CapsLock": {}, "Shift": {}, "Control": {}, "Alt": {},
		"Meta": {}, "Backspace": {}, "Enter": {},
	}
	if _, ok := disallowed[key]; ok {
		return fmt.Errorf("%w: %q", ErrInvalidPracticeKey, key)
	}
	if utf8.RuneCountInString(key) == 1 {
		return nil
	}
	allowed := map[string]struct{}{
		"Space": {},
	}
	if _, ok := allowed[key]; ok {
		return nil
	}
	return fmt.Errorf("%w: %q", ErrInvalidPracticeKey, key)
}

func (r *PracticeGroupRepository) ensureLoaded() error {
	if r.loaded {
		return nil
	}
	path := r.storage.join(practiceGroupsFile)
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			r.store = domain.PracticeGroupStore{Version: practiceGroupsVersion, Groups: nil}
			r.loaded = true
			return nil
		}
		return fmt.Errorf("storage: read practice groups %q: %w", path, err)
	}
	clean := bytes.TrimSpace(data)
	if len(clean) == 0 {
		r.store = domain.PracticeGroupStore{Version: practiceGroupsVersion, Groups: nil}
	} else {
		var store domain.PracticeGroupStore
		if err := json.Unmarshal(clean, &store); err != nil {
			return fmt.Errorf("storage: parse practice groups %q: %w", path, err)
		}
		if store.Version == 0 {
			store.Version = practiceGroupsVersion
		}
		r.store = store
	}
	r.loaded = true
	return nil
}

func (r *PracticeGroupRepository) persist() error {
	r.store.Version = practiceGroupsVersion
	path := r.storage.join(practiceGroupsFile)
	data, err := json.MarshalIndent(r.store, "", "  ")
	if err != nil {
		return fmt.Errorf("storage: marshal practice groups: %w", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("storage: write practice groups %q: %w", path, err)
	}
	return nil
}

// AggregateKeyMistakes sums mistake counts from the most recent sessions.
func (r *SessionRepository) AggregateKeyMistakes(limit int) (map[string]int, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 50
	}
	total := len(r.sessions)
	if total == 0 {
		return map[string]int{}, nil
	}
	start := total - limit
	if start < 0 {
		start = 0
	}
	agg := make(map[string]int)
	for i := start; i < total; i++ {
		for key, count := range r.sessions[i].Mistakes {
			if count <= 0 {
				continue
			}
			agg[key] += count
		}
	}
	return agg, nil
}
