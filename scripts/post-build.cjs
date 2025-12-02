const fs = require('fs-extra');
const path = require('path');

async function moveBundles() {
    try {
        const projectRoot = path.resolve(__dirname, '../');
        const releaseDir = path.join(projectRoot, 'Build', 'Release');
        const bundleDir = path.join(projectRoot, 'Source', 'Tauri', 'target', 'release', 'bundle');

        console.log('Ensuring Build/Release directory exists...');
        await fs.ensureDir(releaseDir);
        
        console.log('Cleaning existing files in Build/Release...');
        await fs.emptyDir(releaseDir);

        console.log(`Looking for bundles in: ${bundleDir}`);
        
        const nsisDir = path.join(bundleDir, 'nsis');
        if (await fs.pathExists(nsisDir)) {
            const files = await fs.readdir(nsisDir);
            for (const file of files) {
                if (file.endsWith('.exe')) {
                    const src = path.join(nsisDir, file);
                    const dest = path.join(releaseDir, file);
                    console.log(`Copying ${file} to Build/Release/`);
                    await fs.copy(src, dest, { overwrite: true });
                }
            }
        }

        const msiDir = path.join(bundleDir, 'msi');
        if (await fs.pathExists(msiDir)) {
            const files = await fs.readdir(msiDir);
            for (const file of files) {
                if (file.endsWith('.msi')) {
                    const src = path.join(msiDir, file);
                    const dest = path.join(releaseDir, file);
                    console.log(`Copying ${file} to Build/Release/`);
                    await fs.copy(src, dest, { overwrite: true });
                }
            }
        }

        console.log('Bundle move complete.');
    } catch (err) {
        console.error('Error moving bundles:', err);
        process.exit(1);
    }
}

moveBundles();
