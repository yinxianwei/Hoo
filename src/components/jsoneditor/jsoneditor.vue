<template>
    <div class="jsoneditor-page jse-theme-dark">
        <div class="panel-header">
            <div>
                <p class="eyebrow">Diff studio</p>
                <h2>Side-by-side JSON compare</h2>
                <p class="hint">Paste JSON on either side, sync across, and highlight adds/replaces/removals.</p>
            </div>
            <el-space wrap>
                <el-tag effect="plain"
                        type="info">Local cache</el-tag>
                <el-tag effect="plain"
                        type="success">Tree/Text modes</el-tag>
                <el-tag effect="plain"
                        type="warning">Patch aware</el-tag>
            </el-space>
        </div>
        <div class="jsoneditor-grid">
            <div class="editor-card">
                <div class="editor-header">
                    <span class="title">Left - Source</span>
                    <span class="badge">Hotkey friendly</span>
                </div>
                <div id="jsoneditor__left"
                     class="editor-surface"></div>
            </div>

            <div class="toolbar">
                <el-button :icon="ArrowRight"
                           @click="rightClick" />
                <el-button :icon="ArrowLeft"
                           @click="leftClick" />
                <el-button type="primary"
                           @click="compareClick">diff</el-button>
                <el-button text
                           type="primary"
                           @click="historyClick">history</el-button>
            </div>

            <div class="editor-card">
                <div class="editor-header">
                    <span class="title">Right - Target</span>
                    <span class="badge">Highlight diffs</span>
                </div>
                <div id="jsoneditor__right"
                     class="editor-surface"></div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { Content, createJSONEditor, isTextContent, JsonEditor, Mode, toTextContent } from 'vanilla-jsoneditor';
import { onMounted } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { generateJSONPatch } from 'generate-json-patch';

let leftEditor!: JsonEditor;
let rightEditor!: JsonEditor;
let jsonPatch: any = {};

function getContentText(content: Content) {
    if (isTextContent(content)) {
        return content.text;
    } else {
        return JSON.stringify(content.json);
    }
}
onMounted(() => {
    leftEditor = createJSONEditor({
        target: document.getElementById('jsoneditor__left') as HTMLDivElement,
        props: {
            mode: Mode.text,
            onChange(updatedContent) {
                window.localStorage.setItem('leftText', getContentText(updatedContent));
            },
            onClassName(path) {
                let fullPath = '/' + path.join('/');
                if (jsonPatch[fullPath]) {
                    return 'diff-' + jsonPatch[fullPath].op;
                }
                return undefined;
            },
            onChangeMode() {
                jsonPatch = {};
            },
        },
    });
    rightEditor = createJSONEditor({
        target: document.getElementById('jsoneditor__right') as HTMLDivElement,
        props: {
            onChange(updatedContent) {
                window.localStorage.setItem('rightText', getContentText(updatedContent));
            },
            onClassName(path) {
                let fullPath = '/' + path.join('/');
                if (jsonPatch[fullPath]) {
                    return 'diff-' + jsonPatch[fullPath].op;
                }
                return undefined;
            },
            onChangeMode() {
                jsonPatch = {};
            },
        },
    });
    let leftText = window.localStorage.getItem('leftText');
    if (leftText) {
        leftEditor.set({ text: leftText });
    }
    let rightText = window.localStorage.getItem('rightText');
    if (rightText) {
        rightEditor.set({ text: rightText });
    }
});

function rightClick() {
    const content = leftEditor.get();
    rightEditor.update(content);
    window.localStorage.setItem('rightText', getContentText(content));
}
function leftClick() {
    const content = rightEditor.get();
    leftEditor.update(content);
    window.localStorage.setItem('leftText', getContentText(content));
}

async function compareClick() {
    jsonPatch = {};
    let leftValue = JSON.parse(toTextContent(leftEditor.get()).text);
    let rightValue = JSON.parse(toTextContent(rightEditor.get()).text);
    generateJSONPatch(leftValue, rightValue).forEach(val => {
        jsonPatch[val.path] = val;
    });
    await Promise.all([leftEditor.updateProps({ mode: Mode.text }), rightEditor.updateProps({ mode: Mode.text })]);
    await Promise.all([leftEditor.updateProps({ mode: Mode.tree }), rightEditor.updateProps({ mode: Mode.tree })]);
}

function historyClick() {}
</script>
<style lang="scss">
@import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

.jsoneditor-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background:
        radial-gradient(circle at 12% 24%, rgba(86, 141, 255, 0.12), transparent 22%),
        radial-gradient(circle at 82% 16%, rgba(67, 220, 190, 0.14), transparent 24%), linear-gradient(135deg, #0a0f1d, #0f172a 45%, #0a0f1d);
    border-radius: 14px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.35);
    height: calc(100vh - var(--el-tabs-header-height) - 32px);
    color: #e5eaf3;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
}

.eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8cb8ff;
    font-weight: 700;
}

h2 {
    margin: 4px 0 6px;
}

.hint {
    margin: 0;
    color: #a7b3c8;
}

.jsoneditor-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: stretch;
    height: 100%;
}

.editor-card {
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
}

.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.title {
    font-weight: 700;
}

.badge {
    font-size: 12px;
    color: #9ab7ff;
}

.editor-surface {
    flex: 1;
    min-height: 320px;
    height: 100%;
}

.toolbar {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    text-align: center;
    align-items: center;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
    .el-button {
        margin-left: 0 !important;
    }
}

.toolbar .el-button:not(.is-circle) {
    width: 120px;
}

.diff-replace .jse-contents {
    background-color: rgba(255, 255, 0, 0.18) !important;
}

.diff-add .jse-contents {
    background-color: rgba(51, 255, 51, 0.16) !important;
}

.diff-remove .jse-contents {
    background-color: rgba(255, 51, 51, 0.16) !important;
}

@media (max-width: 1024px) {
    .jsoneditor-grid {
        grid-template-columns: 1fr;
    }

    .toolbar {
        flex-direction: row;
        justify-content: flex-start;
        width: 100%;
    }

    .toolbar .el-button {
        width: auto;
    }
}

@media (max-width: 640px) {
    .editor-surface {
        min-height: 260px;
    }
}
</style>
