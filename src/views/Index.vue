<script lang="ts" setup>
import jsoneditor from '../components/jsoneditor/jsoneditor.vue';
import gitlab from '../components/gitlab/gitlab.vue';
</script>
<template>
    <el-tabs type="border-card">
        <el-tab-pane label="JSON">
            <jsoneditor />
        </el-tab-pane>
        <el-tab-pane label="GitLab">
            <gitlab />
        </el-tab-pane>
    </el-tabs>
</template>
<style></style>
