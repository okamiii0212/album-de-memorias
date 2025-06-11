const Airtable = require('airtable');
require('dotenv').config(); // Garante que as variáveis de ambiente do .env sejam carregadas localmente
const cloudinary = require('cloudinary').v2;

// Configuração do Cloudinary (usará variáveis de ambiente do Netlify/Cloudinary)
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { title, text, date, imageUrl, youtubeUrl } = JSON.parse(event.body);

        // Inicializa o Airtable
        const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);
        const tableName = process.env.AIRTABLE_TABLE_NAME;

        await base(tableName).create([
            {
                "fields": {
                    "title": title,
                    "text": text,
                    "date": date,
                    "imageUrl": imageUrl,
                    "youtubeUrl": youtubeUrl
                }
            }
        ]);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: 'Memória adicionada com sucesso!' })
        };

    } catch (error) {
        console.error('Erro ao adicionar memória:', error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, message: 'Erro interno do servidor', error: error.message })
        };
    }
};