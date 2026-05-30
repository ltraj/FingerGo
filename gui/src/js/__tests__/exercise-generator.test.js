// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {};
await import('../practice/wordlist-en.js');
await import('../practice/exercise-generator.js');

const { ExerciseGenerator } = globalThis.window;

describe('ExerciseGenerator', () => {
    it('produces deterministic output with the same seed', () => {
        const opts = { targetKeys: ['q', 'a'], length: 200, style: 'words', seed: 42 };
        const a = ExerciseGenerator.generateExercise(opts);
        const b = ExerciseGenerator.generateExercise(opts);
        assert.equal(a.text, b.text);
    });

    it('respects length bounds', () => {
        const result = ExerciseGenerator.generateExercise({
            targetKeys: ['e'],
            length: 150,
            style: 'random',
            seed: 7,
        });
        assert.ok(result.text.length <= 150);
        assert.ok(result.text.length >= 50);
    });

    it('repeat style cycles target keys', () => {
        const result = ExerciseGenerator.generateExercise({
            targetKeys: ['a', 'b'],
            length: 20,
            style: 'repeat',
        });
        assert.ok(result.text.includes('a'));
        assert.ok(result.text.includes('b'));
    });

    it('includes target keys in words style', () => {
        const result = ExerciseGenerator.generateExercise({
            targetKeys: ['q'],
            length: 300,
            style: 'words',
            seed: 99,
        });
        assert.ok(/q/i.test(result.text));
        assert.ok(result.stats.targetCharRatio > 0.1);
    });
});
