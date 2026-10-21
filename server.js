const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Menyajikan file HTML statis dari folder yang sama
app.use(express.static(__dirname));

app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).send('Link URL YouTube tidak ditemukan.');
    }

    console.log(`Memproses unduhan untuk: ${videoUrl}`);

    // Mengatur header agar browser mengenali ini sebagai file unduhan video
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    res.header('Content-Type', 'video/mp4');

    // Menjalankan perintah yt-dlp secara langsung dan mengalirkan (stream) outputnya ke user
    // Pastikan yt-dlp sudah terinstal di komputer atau server Anda!
    const ytdlp = spawn('yt-dlp', [
        '-o', '-',                 // Output dialirkan ke stdout
        '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b', // Kombinasi format video + audio terbaik berformat MP4
        videoUrl
    ]);

    // Mengalirkan data biner video langsung ke browser pengguna
    ytdlp.stdout.pipe(res);

    // Menangani log error dari yt-dlp jika ada masalah
    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp error: ${data.toString()}`);
    });

    ytdlp.on('close', (code) => {
        console.log(`Proses yt-dlp selesai dengan kode: ${code}`);
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan lancar di http://localhost:${PORT}`);
});
