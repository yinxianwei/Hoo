<script lang="ts" setup>
import { onMounted } from 'vue';
import { run } from './schedule/schedule';
onMounted(() => {
    run();
});
</script>

<template>
    <RouterView />
</template>
