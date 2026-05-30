// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

package domain

import "time"

const (
	PracticeModeTargeted   = "targeted"
	PracticeModeCustomText = "custom-text"
)

// PracticeGroup is a user-defined set of keys to drill.
type PracticeGroup struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	LayoutID  string    `json:"layoutId"`
	Keys      []string  `json:"keys"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PracticeGroupStore is the on-disk envelope for custom practice groups.
type PracticeGroupStore struct {
	Version int             `json:"version"`
	Groups  []PracticeGroup `json:"groups"`
}

// PracticeSessionMeta tags ephemeral or targeted practice sessions.
type PracticeSessionMeta struct {
	PracticeMode      string   `json:"practiceMode,omitempty"`
	PracticeGroupID   string   `json:"practiceGroupId,omitempty"`
	PracticeGroupName string   `json:"practiceGroupName,omitempty"`
	TargetKeys        []string `json:"targetKeys,omitempty"`
}
