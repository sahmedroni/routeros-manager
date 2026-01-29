const { RouterOSAPI } = require('node-routeros');
require('dotenv').config();

async function test() {
    const api = new RouterOSAPI({
        host: process.env.ROUTER_HOST || '192.168.0.1',
        user: process.env.ROUTER_USER || 'app-user',
        password: process.env.ROUTER_PASSWORD || '123456',
        port: parseInt(process.env.ROUTER_PORT || '8739'),
        timeout: 10
    });

    try {
        await api.connect();
        console.log('Connected!');

        console.log('--- Health Print (Full) ---');
        const health = await api.write(['/system/health/print']);
        console.log(JSON.stringify(health, null, 2));

        console.log('--- Health Print Detail ---');
        try {
            const healthDetail = await api.write(['/system/health/print', 'detail']);
            console.log(JSON.stringify(healthDetail, null, 2));
        } catch (e) { console.log('detail failed'); }

        console.log('--- Health Get Temperature ---');
        try {
            const temp = await api.write(['/system/health/get', '=number=temperature']);
            console.log('Temp:', JSON.stringify(temp));
        } catch (e) { console.log('get temp failed'); }

        await api.close();
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
