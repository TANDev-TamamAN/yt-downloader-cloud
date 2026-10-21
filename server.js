const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Menentukan lokasi penyimpanan file biner yt-dlp di dalam proyek
const YTDLP_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(YTDLP_DIR, 'yt-dlp');

// Fungsi otomatis untuk mengunduh yt-dlp saat server cloud dinyalakan
function downloadYtdlp() {
    if (!fs.existsSync(YTDLP_DIR)) {
        fs.mkdirSync(YTDLP_DIR);
    }

    if (fs.existsSync(YTDLP_PATH)) {
        console.log('yt-dlp sudah tersedia.');
        fs.chmodSync(YTDLP_PATH, '755'); // Beri izin eksekusi di Linux Cloud
        return;
    }

    console.log('Mengunduh yt-dlp untuk server cloud...');
    // Mengunduh versi Linux standalone karena server Render menggunakan Linux
    const url = 'https://github.com';
    const file = fs.createWriteStream(YTDLP_PATH);

    https.get(url, (response) => {
        // Menangani pengalihan URL (redirect) jika ada
        if (response.statusCode === 302 || response.statusCode === 301) {
            https.get(response.headers.location, (res) => res.pipe(file));
        } else {
            response.pipe(file);
        }

        file.on('finish', () => {
            file.close();
            fs.chmodSync(YTDLP_PATH, '755'); // Beri izin eksekusi
            console.log('Unduhan yt-dlp selesai dan siap digunakan!');
        });
    }).on('error', (err) => {
        fs.unlink(YTDLP_PATH, () => {});
        console.error('Gagal mengunduh yt-dlp:', err.message);
    });
}

// Jalankan fungsi unduh otomatis saat server start
downloadYtdlp();

app.use(express.static(__dirname));
app.use(express.json());

app.post('/download', (req, res) => {
    const videoUrl = req.body.url;
    if (!videoUrl) {
        return res.status(400).send('URL YouTube wajib diisi!');
    }

    // Mengatur header agar browser langsung mendownload file sebagai video MP4
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    res.setHeader('Content-Type', 'video/mp4');

    // Menjalankan yt-dlp langsung ke output stream Express tanpa simpan di harddisk cloud
    const ytdlp = spawn(YTDLP_PATH, [
        '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv+ba / b', // Pilih format MP4 terbaik yang sudah digabung audio
        '-o', '-', // Output langsung ke stdout (stream)
        videoUrl
    ]);

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (data) => {
        console.log(`Log yt-dlp: ${data}`);
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`Proses yt-dlp berhenti dengan kode error: ${code}`);
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server bebas iklan berjalan lancar di port ${PORT}`);
});
