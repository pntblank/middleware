import express from 'express';


app.get('/health', (_, res) => res.json({ ok: true }));


// ---- POST /exemplary/transcribe ----
// Body: { fileId, provider?, language?, speakerLabels?, title? }
app.post('/exemplary/transcribe', requireToken, async (req, res) => {
try {
const { fileId, provider = 'deepgram', language = 'en', speakerLabels = true, title = '' } = req.body || {};
if (!EXM_API_KEY) return res.status(500).json({ error: 'Missing EXM_API_KEY' });
if (!fileId) return res.status(400).json({ error: 'fileId is required' });


const meta = await getDriveFileMeta(fileId); // name, mimeType
const stream = await getDriveFileStream(fileId);


const form = new FormData();
form.append('file', stream, { filename: meta?.name || `${fileId}`, contentType: meta?.mimeType || 'application/octet-stream' });
form.append('language', language);
form.append('provider', provider);
form.append('speaker_labels', String(!!speakerLabels));
if (title) form.append('title', title);


const headers = {
...form.getHeaders(),
Authorization: `Bearer ${EXM_API_KEY}`,
Accept: 'application/json',
};


const { data } = await axios.post(EXM_TRANSCRIPT_URL, form, {
headers,
maxBodyLength: Infinity,
maxContentLength: Infinity,
timeout: 1000 * 60 * 15, // 15 minutes
validateStatus: (s) => s < 500, // let 4xx pass through
});


return res.status(200).json({ ok: true, exm: data });
} catch (err) {
const status = err?.response?.status || 500;
const body = err?.response?.data;
console.error('Upload error:', status, body || err.message);
return res.status(status).json({ ok: false, error: body || err.message });
}
});


// ---- GET /exemplary/status/:id ----
app.get('/exemplary/status/:id', requireToken, async (req, res) => {
try {
const { id } = req.params;
const { data } = await axios.get(`${EXM_BASE_URL}/transcript/${id}`, {
headers: { Authorization: `Bearer ${EXM_API_KEY}`, Accept: 'application/json' },
timeout: 1000 * 60 * 5,
});
return res.json({ ok: true, exm: data });
} catch (err) {
const status = err?.response?.status || 500;
const body = err?.response?.data;
console.error('Status error:', status, body || err.message);
return res.status(status).json({ ok: false, error: body || err.message });
}
});


// ---- OPTIONAL STUB: POST /captivate/episode ----
// Body: { fileId, title, description, publishAt, ... }
// TODO: Replace with Captivate's actual upload API once provided.
app.post('/captivate/episode', requireToken, async (req, res) => {
return res.status(501).json({ ok: false, error: 'Captivate API details not provided. Add implementation once available.' });
});


app.listen(PORT, () => console.log(`Middleware listening on :${PORT}`));
