import { fetch } from '@tauri-apps/plugin-http';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { error } from '@tauri-apps/plugin-log';

const delayTime = 60 * 1000 * 5;
let runing = false;
let rows: any[] = [];
async function delay() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, delayTime);
    });
}
async function loadData() {
    const url = localStorage.getItem('GITLAB_URL');
    const token = localStorage.getItem('GITLAB_TOKEN');
    if (url && token) {
        try {
            let res = await fetch(url, {
                connectTimeout: 15000,
                method: 'GET',
                headers: { 'PRIVATE-TOKEN': token },
            });
            let data = await res.json();
            if (data && data.length) {
                if (!data.find((val: any) => rows.find((c: any) => c.id == val.id))) {
                    sendNotification({ title: 'Hoo', body: 'new merge request!' });
                }
            }
            rows = data || [];
        } catch (err) {
            error(err as string);
            sendNotification({ title: 'Hoo', body: 'error!' });
        }
        await delay();
        loadData();
    }
}
export async function run() {
    if (runing) {
        return;
    }
    runing = true;
    loadData();
}
