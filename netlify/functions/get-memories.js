const Airtable = require('airtable');
require('dotenv').config();

exports.handler = async (event, context) => {
    try {
        const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);
        const tableName = process.env.AIRTABLE_TABLE_NAME;

        const records = await base(tableName).select({
            sort: [{field: "date", direction: "desc"}]
        }).firstPage();

        const memories = records.map(record => ({
            id: record.id,
            title: record.get('title'),
            text: record.get('text'),
            imageUrl: record.get('imageUrl'),
            youtubeUrl: record.get('youtubeUrl'),
            date: record.get('date')
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, memories })
        };

    } catch (error) {
        console.error('Erro ao buscar memórias do Airtable:', error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, message: 'Erro ao buscar memórias', error: error.message })
        };
    }
};