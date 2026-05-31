// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

package storage

import (
	"testing"

	domain "github.com/AshBuk/FingerGo/internal/domain"
)

func TestSessionRepository_AggregateKeyMistakes(t *testing.T) {
	mgr, err := New(t.TempDir())
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := mgr.Init(); err != nil {
		t.Fatalf("Init: %v", err)
	}
	sessions, err := NewSessionRepository(mgr)
	if err != nil {
		t.Fatalf("NewSessionRepository: %v", err)
	}

	payload := &domain.SessionPayload{
		SessionTextMeta: &domain.SessionTextMeta{Text: "test"},
		Mistakes:        map[string]int{"q": 2, "w": 1},
	}
	if _, err := sessions.Record(payload); err != nil {
		t.Fatalf("Record: %v", err)
	}
	payload2 := &domain.SessionPayload{
		SessionTextMeta: &domain.SessionTextMeta{Text: "test2"},
		Mistakes:        map[string]int{"q": 3},
	}
	if _, err := sessions.Record(payload2); err != nil {
		t.Fatalf("Record 2: %v", err)
	}

	agg, err := sessions.AggregateKeyMistakes(10)
	if err != nil {
		t.Fatalf("AggregateKeyMistakes: %v", err)
	}
	if agg["q"] != 5 {
		t.Errorf("q mistakes = %d, want 5", agg["q"])
	}
	if agg["w"] != 1 {
		t.Errorf("w mistakes = %d, want 1", agg["w"])
	}
}
