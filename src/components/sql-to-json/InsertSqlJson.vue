<template>
    <div class="sql2json">
        <div class="panel-header">
            <div>
                <p class="eyebrow">SQL quick utility</p>
                <h2>INSERT to JSON mapper</h2>
                <p class="subtle">Paste an INSERT statement, convert into structured JSON, and inspect with JSONEditor.</p>
            </div>
            <el-space wrap>
                <el-tag effect="dark" type="success">Multi-row supported</el-tag>
                <el-tag effect="dark" type="info">Auto type detection</el-tag>
                <el-tag effect="dark" type="warning">Trims comments/semicolon</el-tag>
            </el-space>
        </div>

        <div class="panel-grid">
            <div class="card card-input">
                <div class="card-header">
                    <div>
                        <p class="label">Source SQL</p>
                        <h3>INSERT statement</h3>
                    </div>
                    <el-space size="small">
                        <el-button text type="primary" @click="fillSample">Use sample</el-button>
                        <el-button text type="info" @click="clearInput">Clear</el-button>
                    </el-space>
                </div>
                <el-input
                    v-model="sqlInput"
                    type="textarea"
                    :autosize="{ minRows: 8, maxRows: 18 }"
                    placeholder="INSERT INTO users (id, name) VALUES (1, 'Jane');"
                />
                <div class="helper-row">
                    <el-tag size="small" effect="plain" type="info">Columns are mapped to values in order.</el-tag>
                    <span class="helper">Supports simple INSERT ... VALUES syntax with multiple rows.</span>
                </div>
                <div class="actions">
                    <el-button type="primary" @click="convertSql">Convert</el-button>
                    <el-button plain @click="beautifySql">Format SQL</el-button>
                </div>
                <el-alert v-if="errorMessage" type="error" :closable="false" show-icon class="alert">
                    {{ errorMessage }}
                </el-alert>
            </div>

            <div class="card card-output">
                <div class="card-header">
                    <div>
                        <p class="label">Result JSON</p>
                        <h3>JSON preview</h3>
                    </div>
                    <el-button text type="success" @click="copyJson">Copy JSON</el-button>
                </div>
                <div id="insert-jsoneditor" class="editor jse-theme-dark"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { createJSONEditor, isJSONContent, JsonEditor, Mode } from 'vanilla-jsoneditor';
import { onMounted, ref } from 'vue';

const sampleSql = `INSERT INTO users (id, name, email, is_active, created_at)
VALUES
    (1, 'Jane Doe', 'jane@example.com', true, '2024-08-01 10:00:00'),
    (2, 'John Roe', 'john.roe@example.com', false, NULL);`;

const sqlInput = ref(sampleSql);
const errorMessage = ref('');
let jsonEditor: JsonEditor | null = null;

onMounted(() => {
    jsonEditor = createJSONEditor({
        target: document.getElementById('insert-jsoneditor') as HTMLDivElement,
        props: {
            mode: Mode.tree,
            navigationBar: false,
            readOnly: true,
        },
    });
    convertSql();
});

function fillSample() {
    sqlInput.value = sampleSql;
    convertSql();
}

function clearInput() {
    sqlInput.value = '';
    errorMessage.value = '';
    setEditorContent({});
}

function beautifySql() {
    if (!sqlInput.value.trim()) return;
    const normalized = sqlInput.value
        .replace(/;+\s*$/, '')
        .replace(/\s+/g, ' ')
        .replace(/VALUES/i, '\nVALUES\n    ')
        .replace(/\)\s*,\s*\(/g, '),\n    (');
    sqlInput.value = normalized.trim() + ';';
}

function convertSql() {
    errorMessage.value = '';
    try {
        const parsed = parseInsertSql(sqlInput.value);
        setEditorContent(parsed);
        ElMessage.success('Converted to JSON');
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Failed to convert SQL.';
    }
}

function copyJson() {
    if (!jsonEditor) return;
    const content = jsonEditor.get();
    const value = isJSONContent(content) ? JSON.stringify(content.json, null, 2) : content.text;
    navigator.clipboard.writeText(value || '').then(() => {
        ElMessage.success('Copied');
    });
}

function setEditorContent(content: Record<string, unknown>) {
    if (!jsonEditor) return;
    jsonEditor.set({ json: content });
}

function parseInsertSql(raw: string) {
    const sql = raw.trim().replace(/--.*$/gm, '').replace(/;+\s*$/, '');
    if (!sql) {
        throw new Error('Please provide an INSERT statement.');
    }

    const headerMatch = /insert\s+into\s+[`"]?([\w.]+)[`"]?\s*(\(([^)]*)\))?/i.exec(sql);
    if (!headerMatch) {
        throw new Error('Could not find table name after INSERT INTO.');
    }

    const table = headerMatch[1];
    const columnList = headerMatch[3]?.split(',').map((c) => c.trim().replace(/[`"]/g, '')).filter(Boolean);

    const valuesIndex = sql.toLowerCase().indexOf('values');
    if (valuesIndex === -1) {
        throw new Error('INSERT must contain VALUES block.');
    }
    const valuesBlock = sql.slice(valuesIndex + 'values'.length).trim();
    const tupleStrings = splitTopLevelTuples(valuesBlock);
    if (!tupleStrings.length) {
        throw new Error('No value tuples detected.');
    }

    const rows = tupleStrings.map((tuple) => mapTupleToRow(tuple, columnList));
    const columns = columnList?.length ? columnList : Object.keys(rows[0] || {});

    return {
        table,
        columns,
        rows,
    };
}

function splitTopLevelTuples(values: string) {
    const cleaned = values.replace(/^\(+/, '(').trim();
    const tuples: string[] = [];
    let depth = 0;
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < cleaned.length; i += 1) {
        const ch = cleaned[i];
        const prev = cleaned[i - 1];

        if ((ch === '"' || ch === "'") && prev !== '\\') {
            if (!inQuote) {
                inQuote = true;
                quoteChar = ch;
            } else if (quoteChar === ch) {
                inQuote = false;
            }
            current += ch;
            continue;
        }

        if (!inQuote) {
            if (ch === '(') depth += 1;
            if (ch === ')') depth -= 1;
            if (ch === ',' && depth === 0) {
                if (current.trim()) {
                    tuples.push(current.trim());
                }
                current = '';
                continue;
            }
        }

        current += ch;
    }

    if (current.trim()) {
        tuples.push(current.trim());
    }

    return tuples;
}

function mapTupleToRow(tuple: string, columns?: string[]) {
    const body = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
    const values = splitValues(body);
    const safeColumns = columns?.length ? columns : values.map((_, idx) => `column_${idx + 1}`);

    if (safeColumns.length !== values.length) {
        throw new Error('Column count does not match values count.');
    }

    return safeColumns.reduce<Record<string, unknown>>((acc, col, idx) => {
        acc[col] = parseValue(values[idx]);
        return acc;
    }, {});
}

function splitValues(body: string) {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < body.length; i += 1) {
        const ch = body[i];
        const prev = body[i - 1];

        if ((ch === '"' || ch === "'") && prev !== '\\') {
            if (!inQuote) {
                inQuote = true;
                quoteChar = ch;
            } else if (quoteChar === ch) {
                inQuote = false;
            }
            current += ch;
            continue;
        }

        if (!inQuote && ch === ',') {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

function parseValue(raw: string): unknown {
    const value = raw.trim();
    const unquoted = value.replace(/^['"]|['"]$/g, '');

    if (/^(null)$/i.test(value)) return null;
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';

    const numeric = Number(value);
    if (!Number.isNaN(numeric) && /^[-+]?\d+(\.\d+)?$/.test(value)) {
        return numeric;
    }

    return unquoted.replace(/''/g, "'").replace(/\\"/g, '"');
}
</script>

<style scoped lang="scss">
@import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

.sql2json {
    display: flex;
    flex-direction: column;
    gap: 18px;
    background: radial-gradient(circle at 10% 20%, rgba(76, 140, 255, 0.12), transparent 25%),
        radial-gradient(circle at 90% 10%, rgba(60, 209, 170, 0.14), transparent 22%),
        linear-gradient(135deg, #0b1220, #0f172a 42%, #0b1220 100%);
    border-radius: 14px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
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
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8bb4ff;
    font-weight: 700;
    margin: 0 0 4px;
}

h2 {
    margin: 0 0 6px;
    font-size: 22px;
}

.subtle {
    margin: 0;
    color: #a3adbd;
}

.panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
}

.card {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(6px);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

.label {
    margin: 0;
    color: #9ab7ff;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

h3 {
    margin: 4px 0 0;
}

.helper-row {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9da9bf;
}

.helper {
    font-size: 13px;
}

.actions {
    margin-top: 14px;
    display: flex;
    gap: 10px;
}

.alert {
    margin-top: 10px;
}

.card-output {
    min-height: 360px;
    display: flex;
    flex-direction: column;
}

.editor {
    flex: 1;
    min-height: 320px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

:deep(.el-textarea__inner) {
    background-color: #0d1526;
    border-color: rgba(255, 255, 255, 0.08);
    color: #e8edf7;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
}

:deep(.el-button.is-text) {
    color: #8bb4ff;
}

:deep(.el-button.is-text:hover) {
    background-color: rgba(139, 180, 255, 0.08);
}

@media (max-width: 768px) {
    .panel-header {
        flex-direction: column;
    }

    .card-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
