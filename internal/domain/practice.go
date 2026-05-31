// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

package domain

const PracticeModeTargeted = "targeted"

// PracticeSessionMeta tags targeted practice sessions.
type PracticeSessionMeta struct {
	PracticeMode      string   `json:"practiceMode,omitempty"`
	PracticeGroupID   string   `json:"practiceGroupId,omitempty"`
	PracticeGroupName string   `json:"practiceGroupName,omitempty"`
	TargetKeys        []string `json:"targetKeys,omitempty"`
}
