<script lang="ts" setup>
import { ref } from 'vue';
import jsoneditor from '../components/jsoneditor/jsoneditor.vue';
import InsertSqlJson from '../components/sql-to-json/InsertSqlJson.vue';

const activeTab = ref('json');
</script>
<template>
    <el-tabs v-model="activeTab"
             type="border-card"
             class="workspace-tabs">
        <el-tab-pane label="JSON Diff"
                     name="json">
            <jsoneditor />
        </el-tab-pane>
        <el-tab-pane label="INSERT -> JSON"
                     name="sql-json">
            <InsertSqlJson />
        </el-tab-pane>
    </el-tabs>
</template>

<style>
.el-tabs__content {
    padding: 0 !important;
}
.workspace-tabs {
}

.workspace-tabs :deep(.el-tab-pane) {
}
</style>
