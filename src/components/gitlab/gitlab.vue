<template>
    <div>
        <el-form ref="ruleFormRef" :model="form" :rules="rules" label-width="auto" style="max-width: 400px">
            <el-form-item label="URL" prop="url">
                <el-input v-model="form.url" />
            </el-form-item>
            <el-form-item label="TOKEN" prop="token">
                <el-input v-model="form.token" />
            </el-form-item>
            <el-form-item label=" ">
                <el-button type="primary" @click="onSubmit(ruleFormRef)">Save</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>
<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { run } from '../../schedule/schedule';
interface RuleForm {
    url: string;
    token: string;
}
const ruleFormRef = ref<FormInstance>();
const form = reactive({
    url: localStorage.getItem('GITLAB_URL') || '',
    token: localStorage.getItem('GITLAB_TOKEN') || '',
});
const rules = reactive<FormRules<RuleForm>>({
    url: [{ required: true, trigger: 'blur' }],
    token: [{ required: true, trigger: 'blur' }],
});
const onSubmit = async (formEl: FormInstance | undefined) => {
    if (!formEl) {
        return;
    }
    await formEl.validate(async (valid) => {
        if (valid) {
            localStorage.setItem('GITLAB_URL', form.url);
            localStorage.setItem('GITLAB_TOKEN', form.token);
            let permissionGranted = await isPermissionGranted();
            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
            }
            if (permissionGranted) {
                sendNotification({ title: 'Hoo', body: 'Success' });
            }
            run();
        }
    });
};
</script>
<style></style>
