// Copyright 2025 Asher Buk
// SPDX-License-Identifier: Apache-2.0
// https://github.com/AshBuk/FingerGo

/**
 * Targeted practice modal: groups, weak-key suggestions, exercise generation.
 */
(() => {
    if (!window.ModalManager) return;

    const esc = window.PracticeManager?.esc || (s => String(s ?? ''));
    const PM = () => window.PracticeManager;
    const DEBUG = false;
    const log = (...args) => {
        if (DEBUG) console.log('[TargetedPractice]', ...args);
    };

    const state = {
        selectedGroup: null,
        length: 300,
        style: 'words',
        previewSeed: 1,
        weakKeys: [],
        customGroups: [],
        editingGroup: null,
        pickerKeys: new Set(),
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
            state.groupCache.set(`${source}:${group.id}`, { ...group, keys: [...(group.keys || [])] });
        };
        PM().getBuiltinGroups().forEach(add);
        state.customGroups.forEach(g => add({ ...g, source: 'custom' }));
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
        log('preview', state.selectedGroup.id, state.selectedGroup.keys.length);
        const result = window.ExerciseGenerator?.generateExercise({
            targetKeys: state.selectedGroup.keys,
            length: state.length,
            style: state.style,
            seed: state.previewSeed,
        });
        const preview = esc((result?.text || '').slice(0, 160));
        return `<p class="practice-preview">${preview}${(result?.text?.length || 0) > 160 ? '…' : ''}</p>`;
    }

    function renderGroupCard(group, extraClass = '') {
        const keysPreview = esc(group.keys.slice(0, 14).join(' '));
        const selected = state.selectedGroup?.id === group.id ? ' selected' : '';
        const isCustom = group.source === 'custom';
        const editBtn = isCustom
            ? `<button type="button" class="practice-group-edit" data-edit-id="${esc(group.id)}" title="Edit">✎</button>`
            : '';
        return `<div role="button" tabindex="0" class="practice-group-card${selected}${extraClass}" data-group-id="${esc(group.id)}" data-source="${esc(group.source || 'builtin')}">
            <span class="practice-group-name">${esc(group.name)}</span>
            <span class="practice-group-keys">${keysPreview}${group.keys.length > 14 ? '…' : ''}</span>
            ${editBtn}
        </div>`;
    }

    async function refreshData() {
        state.weakKeys = await PM().fetchWeakKeys(50);
        state.customGroups = await PM().fetchCustomGroups();
        rebuildGroupCache();
    }

    function renderWeakSection() {
        if (!state.weakKeys.length) {
            return '<p class="practice-muted">Complete typing sessions to see weak-key suggestions.</p>';
        }
        const chips = state.weakKeys
            .map(([key, count]) => `<span class="weak-key-chip">${esc(formatKeyLabel(key))} <em>${count}</em></span>`)
            .join('');
        return `<div class="weak-keys-row">${chips}
            <button type="button" class="practice-link-btn" id="practice-weak-start">Practice these keys</button>
        </div>`;
    }

    function renderCustomSection() {
        if (!state.customGroups.length) {
            return '<p class="practice-muted">No custom groups yet.</p>';
        }
        return state.customGroups
            .map(g =>
                renderGroupCard(
                    { ...g, id: g.id, name: g.name, keys: g.keys, source: 'custom' },
                    ' custom',
                ),
            )
            .join('');
    }

    function renderEditor() {
        const name = esc(state.editingGroup?.name || '');
        const selected = [...state.pickerKeys].map(k => esc(formatKeyLabel(k))).join(', ');
        const layout = PM().getLayoutId();
        const layoutObj =
            window.KeyboardLayouts?.getLayout?.(layout) ||
            window.KeyboardLayouts?.getDefaultLayout?.();
        const keys = layoutObj?.fingerMap ? Object.keys(layoutObj.fingerMap) : [];
        const keyButtons = keys
            .filter(k => !['Tab', 'CapsLock', 'Backspace', 'Enter'].includes(k))
            .slice(0, 80)
            .map(k => {
                const on = state.pickerKeys.has(k) ? ' active' : '';
                return `<button type="button" class="key-pick-btn${on}" data-key="${esc(k)}">${esc(formatKeyLabel(k))}</button>`;
            })
            .join('');
        return `<div class="practice-editor">
            <h4>${state.editingGroup?.id ? 'Edit' : 'New'} custom group</h4>
            <label>Name <input type="text" id="practice-group-name" value="${name}" maxlength="64"></label>
            <p class="practice-muted">Selected: <span id="practice-selected-keys">${selected || 'none'}</span></p>
            <div class="key-picker-grid">${keyButtons}</div>
            <div class="practice-editor-actions">
                <button type="button" id="practice-editor-cancel">Cancel</button>
                <button type="button" id="practice-editor-save">Save group</button>
            </div>
        </div>`;
    }

    function render() {
        if (state.editingGroup !== null) return renderEditor();
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
                <h4>Custom groups <button type="button" class="practice-link-btn" id="practice-new-group">+ New group</button></h4>
                <div class="practice-group-grid custom-groups" id="practice-custom-grid">${renderCustomSection()}</div>
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
        if (!group?.keys?.length) {
            log('selectGroup rejected: no keys', group);
            return;
        }
        state.selectedGroup = {
            id: group.id,
            name: group.name,
            keys: [...group.keys],
            source: group.source,
        };
        state.previewSeed++;
        log('selectGroup', state.selectedGroup.id, state.selectedGroup.keys.length);
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
        if (state.editingGroup !== null) {
            container.querySelectorAll('.key-pick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.key;
                    if (state.pickerKeys.has(key)) state.pickerKeys.delete(key);
                    else state.pickerKeys.add(key);
                    rerender();
                });
            });
            container.querySelector('#practice-editor-cancel')?.addEventListener('click', () => {
                state.editingGroup = null;
                state.pickerKeys.clear();
                rerender();
            });
            container.querySelector('#practice-editor-save')?.addEventListener('click', async () => {
                const name = container.querySelector('#practice-group-name')?.value?.trim();
                if (!name || state.pickerKeys.size === 0) return;
                const group = {
                    id: state.editingGroup?.id || '',
                    name,
                    layoutId: PM().getLayoutId(),
                    keys: [...state.pickerKeys],
                };
                try {
                    await PM().saveCustomGroup(group);
                    state.editingGroup = null;
                    state.pickerKeys.clear();
                    await refreshData();
                    rerender();
                } catch (err) {
                    console.error('Save practice group failed:', err);
                }
            });
            return;
        }

        container.querySelector('#practice-weak-start')?.addEventListener('click', () => {
            const group = state.groupCache.get('suggested:builtin-weak-keys');
            if (!group?.keys?.length) return;
            log('weak-start', group.keys);
            PM().startTargeted(group, {
                length: state.length,
                style: state.style,
                seed: Date.now(),
            });
        });

        container.querySelectorAll('.practice-group-card').forEach(card => {
            card.addEventListener('click', e => {
                if (e.target.closest('.practice-group-edit')) return;
                const group = resolveGroupFromCard(card);
                log('card click', card.dataset.source, card.dataset.groupId, Boolean(group));
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

        container.querySelectorAll('.practice-group-edit').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const g = state.customGroups.find(x => x.id === btn.dataset.editId);
                if (!g) return;
                state.editingGroup = { id: g.id };
                state.pickerKeys = new Set(g.keys);
                rerender();
            });
        });

        container.querySelectorAll('.custom-groups .practice-group-card').forEach(card => {
            card.addEventListener('contextmenu', e => {
                e.preventDefault();
                const id = card.dataset.groupId;
                if (confirm('Delete this custom group?')) {
                    PM()
                        .deleteCustomGroup(id)
                        .then(async () => {
                            await refreshData();
                            if (state.selectedGroup?.id === id) state.selectedGroup = null;
                            rerender();
                        });
                }
            });
        });

        container.querySelector('#practice-new-group')?.addEventListener('click', () => {
            state.editingGroup = {};
            state.pickerKeys.clear();
            rerender();
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
            if (!state.selectedGroup?.keys?.length) {
                log('start blocked: no selection');
                return;
            }
            log('start practice', state.selectedGroup.id);
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
