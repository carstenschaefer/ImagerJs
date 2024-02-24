try {
    if (!window.live_reload_enabled) {
        window.live_reload_enabled = true;
        const url = `http://localhost:8989/esbuild`;
        new EventSource(url).addEventListener('change', () => {
            document.body.innerHTML = '<h1>RELOADING<h1>';
            location.reload();
        })
        console.log('live reload enabled: ', url);
    }
} catch (error) {
    console.error('live reload failed', error);
}