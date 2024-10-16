import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import App from './App.vue';
import router from './router';
import './style/index';

const app = createApp(App);
app.use(ElementPlus, {
    locale: zhCn,
});
app.use(router);
app.mount('#app');
