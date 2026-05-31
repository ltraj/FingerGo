// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

package app

import (
	"testing"
	"time"

	domain "github.com/AshBuk/FingerGo/internal/domain"
)

func TestApp_AggregateKeyMistakes(t *testing.T) {
	app := startApp(t, t.TempDir())

	payload := &domain.SessionPayload{
		SessionTextMeta: &domain.SessionTextMeta{Text: "test"},
		Mistakes:        map[string]int{"a": 2},
	}
	if err := app.SaveSession(payload); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	agg, err := app.AggregateKeyMistakes(10)
	if err != nil {
		t.Fatalf("AggregateKeyMistakes: %v", err)
	}
	if agg["a"] != 2 {
		t.Errorf("a = %d, want 2", agg["a"])
	}
}

func TestSessionPayload_PracticeMeta(t *testing.T) {
	payload := &domain.SessionPayload{
		SessionTextMeta: &domain.SessionTextMeta{Text: "qqq"},
		PracticeSessionMeta: domain.PracticeSessionMeta{
			PracticeMode:      domain.PracticeModeTargeted,
			PracticeGroupID:   "builtin-home-row",
			PracticeGroupName: "Home row",
			TargetKeys:        []string{"a", "s"},
		},
	}
	session := payload.ToTypingSession(time.Now())
	if session.PracticeMode != domain.PracticeModeTargeted {
		t.Errorf("mode = %q", session.PracticeMode)
	}
	if len(session.TargetKeys) != 2 {
		t.Errorf("targetKeys = %v", session.TargetKeys)
	}
}
