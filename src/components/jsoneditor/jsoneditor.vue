<template>
    <div class="jsoneditor_panel jse-theme-dark">
        <div id="jsoneditor__left"></div>
        <div id="jsoneditor__gap">
            <el-space direction="vertical">
                <el-button :dark="true" :icon="ArrowRight" @click="rightClick" />
                <el-button :dark="true" :icon="ArrowLeft" @click="leftClick" />
                <el-button :dark="true" @click="compareClick">Compare</el-button>
                <el-button :dark="true" @click="historyClick">History</el-button>
            </el-space>
        </div>
        <div id="jsoneditor__right"></div>
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
    generateJSONPatch(leftValue, rightValue).forEach((val) => {
        jsonPatch[val.path] = val;
    });
    await Promise.all([leftEditor.updateProps({ mode: Mode.text }), rightEditor.updateProps({ mode: Mode.text })]);
    await Promise.all([leftEditor.updateProps({ mode: Mode.tree }), rightEditor.updateProps({ mode: Mode.tree })]);
}

function historyClick() {}
</script>
<style lang="scss">
@import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
.jsoneditor_panel {
    height: calc(100vh - var(--el-tabs-header-height) - 32px);
    display: flex;
    #jsoneditor__left,
    #jsoneditor__right {
        flex: 1;
    }
    #jsoneditor__gap {
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        button {
            max-width: 80px;
            min-width: 80px;
        }
    }
    .diff-replace .jse-contents {
        background-color: rgba(255, 255, 0, 0.2) !important;
    }
    .diff-add .jse-contents {
        background-color: rgba(51, 255, 51, 0.2) !important;
    }
    .diff-remove .jse-contents {
        background-color: rgba(255, 51, 51, 0.2) !important;
    }
}
</style>
