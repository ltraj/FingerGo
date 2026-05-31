// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Targeted practice modal: built-in groups, weak-key suggestions, exercise generation.
 */
(() => {
    if (!window.ModalManager) return;

    const esc = window.PracticeManager?.esc || (s => String(s ?? ''));
    const PM = () => window.PracticeManager;

    const state = {
        selectedGroup: null,
        length: 300,
        style: 'words',
        previewSeed: 1,
        weakKeys: [],
        groupCache: new Map(),
        dataLoaded: false,
    };

    function formatKeyLabel(key) {
        if (key === ' ') return 'Space';
        return key;
    }

    function rebuildGroupCache() {
        state.groupCache.clear();
        const add = group => {
            if (!group?.id) return;
            const source = group.source || 'builtin';
            state.groupCache.set(`${source}:${group.id}`, {
                ...group,
                keys: [...(group.keys || [])],
            });
        };
        PM().getBuiltinGroups().forEach(add);
        if (state.weakKeys.length) {
            add({
                id: 'builtin-weak-keys',
                name: 'Weak keys',
                keys: state.weakKeys.map(([k]) => k),
                source: 'suggested',
            });
        }
    }

    function resolveGroupFromCard(card) {
        const key = `${card.dataset.source}:${card.dataset.groupId}`;
        return state.groupCache.get(key) || null;
    }

    function renderPreview() {
        if (!state.selectedGroup?.keys?.length) {
            return '<p class="practice-muted">Select a group to preview.</p>';
        }
        const result = window.ExerciseGenerator?.generateExercise({
            targetKeys: state.selectedGroup.keys,
            length: state.length,
            style: state.style,
            seed: state.previewSeed,
        });
        const preview = esc((result?.text || '').slice(0, 160));
        return `<p class="practice-preview">${preview}${(result?.text?.length || 0) > 160 ? '…' : ''}</p>`;
    }

    function renderGroupCard(group) {
        const keysPreview = esc(group.keys.slice(0, 14).join(' '));
        const selected = state.selectedGroup?.id === group.id ? ' selected' : '';
        return `<div role="button" tabindex="0" class="practice-group-card${selected}" data-group-id="${esc(group.id)}" data-source="${esc(group.source || 'builtin')}">
            <span class="practice-group-name">${esc(group.name)}</span>
            <span class="practice-group-keys">${keysPreview}${group.keys.length > 14 ? '…' : ''}</span>
        </div>`;
    }

    async function refreshData() {
        state.weakKeys = await PM().fetchWeakKeys(50);
        rebuildGroupCache();
    }

    function renderWeakSection() {
        if (!state.weakKeys.length) {
            return '<p class="practice-muted">Complete typing sessions to see weak-key suggestions.</p>';
        }
        const chips = state.weakKeys
            .map(
                ([key, count]) =>
                    `<span class="weak-key-chip">${esc(formatKeyLabel(key))} <em>${count}</em></span>`,
            )
            .join('');
        return `<div class="weak-keys-row">${chips}
            <button type="button" class="practice-link-btn" id="practice-weak-start">Practice these keys</button>
        </div>`;
    }

    function render() {
        rebuildGroupCache();
        const builtins = [...state.groupCache.values()].filter(g => g.source === 'builtin');
        const suggested = state.groupCache.get('suggested:builtin-weak-keys');
        let builtinCards = builtins.map(g => renderGroupCard(g));
        if (suggested) {
            builtinCards = [renderGroupCard(suggested), ...builtinCards];
        }
        return `<div class="targeted-practice">
            <section class="practice-section">
                <h4>Suggested weak keys</h4>
                ${renderWeakSection()}
            </section>
            <section class="practice-section">
                <h4>Built-in groups</h4>
                <div class="practice-group-grid" id="practice-builtin-grid">${builtinCards.join('')}</div>
            </section>
            <section class="practice-section">
                <h4>Exercise</h4>
                <div class="practice-options">
                    <label>Length <input type="number" id="practice-length" min="100" max="2000" value="${state.length}"></label>
                    <label>Style
                        <select id="practice-style">
                            <option value="words"${state.style === 'words' ? ' selected' : ''}>Words</option>
                            <option value="random"${state.style === 'random' ? ' selected' : ''}>Random</option>
                            <option value="repeat"${state.style === 'repeat' ? ' selected' : ''}>Repeat</option>
                        </select>
                    </label>
                    <button type="button" id="practice-regenerate-preview">Regenerate preview</button>
                </div>
                ${renderPreview()}
            </section>
            <div class="practice-modal-actions">
                <button type="button" id="practice-start"${state.selectedGroup ? '' : ' disabled'}>Start practice</button>
            </div>
        </div>`;
    }

    function selectGroup(group) {
        if (!group?.keys?.length) return;
        state.selectedGroup = {
            id: group.id,
            name: group.name,
            keys: [...group.keys],
            source: group.source,
        };
        state.previewSeed++;
    }

    function paint(container) {
        if (!container) return;
        container.innerHTML = render();
        bindHandlers(container);
    }

    function rerender() {
        const container = document.getElementById('modal-content');
        const overlay = document.getElementById('modal-overlay');
        if (!container || overlay?.classList.contains('modal-hidden')) return;
        paint(container);
    }

    function bindHandlers(container) {
        container.querySelector('#practice-weak-start')?.addEventListener('click', () => {
            const group = state.groupCache.get('suggested:builtin-weak-keys');
            if (!group?.keys?.length) return;
            PM().startTargeted(group, {
                length: state.length,
                style: state.style,
                seed: Date.now(),
            });
        });

        container.querySelectorAll('.practice-group-card').forEach(card => {
            card.addEventListener('click', () => {
                const group = resolveGroupFromCard(card);
                if (!group) return;
                selectGroup(group);
                rerender();
            });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        container.querySelector('#practice-length')?.addEventListener('change', e => {
            state.length = Number(e.target.value) || 300;
            state.previewSeed++;
            rerender();
        });
        container.querySelector('#practice-style')?.addEventListener('change', e => {
            state.style = e.target.value;
            state.previewSeed++;
            rerender();
        });
        container.querySelector('#practice-regenerate-preview')?.addEventListener('click', () => {
            state.previewSeed++;
            rerender();
        });

        container.querySelector('#practice-start')?.addEventListener('click', () => {
            if (!state.selectedGroup?.keys?.length) return;
            PM().startTargeted(state.selectedGroup, {
                length: state.length,
                style: state.style,
                seed: Date.now(),
            });
        });
    }

    window.EventBus?.on('modal:closed', () => {
        state.dataLoaded = false;
    });

    window.ModalManager.registerType('targeted-practice', {
        title: 'Targeted Practice',
        render: () => render(),
        bind(_data, container) {
            rebuildGroupCache();
            bindHandlers(container);
            if (!state.dataLoaded) {
                state.dataLoaded = true;
                refreshData()
                    .then(() => {
                        const overlay = document.getElementById('modal-overlay');
                        if (!overlay?.classList.contains('modal-hidden')) {
                            paint(container);
                        }
                    })
                    .catch(err => console.error('Targeted practice: refresh failed', err));
            }
        },
    });
})();
