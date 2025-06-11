// Variáveis globais para o player do YouTube
let player;
let currentPlayingButton = null;

// Função chamada automaticamente pela API do YouTube quando ela está pronta
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API is ready.');
}

// Função para extrair o ID do vídeo do YouTube de uma URL
function getYouTubeVideoId(url) {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

// Função para criar um cartão de memória no HTML
function createMemoryCard(memory) {
    const memoryGrid = document.querySelector('.memory-grid');

    const card = document.createElement('div');
    card.classList.add('memory-card');

    const formattedDate = new Date(memory.fields.eventDate).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const videoId = getYouTubeVideoId(memory.fields.youtubeURL);

    card.innerHTML = `
        <img src="${memory.fields.photoURL}" alt="${memory.fields.title}">
        <div class="memory-content">
            <h2>${memory.fields.title}</h2>
            <p>${memory.fields.text}</p>
            <p class="memory-date">Em: ${formattedDate}</p>
            ${videoId ? `
                <div class="music-player-container">
                    <button class="play-button" data-video-id="${videoId}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Tocar Música
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    memoryGrid.appendChild(card);
}

// Função para carregar as memórias do Airtable via Netlify Function
async function loadMemories() {
    const memoryGrid = document.querySelector('.memory-grid');
    memoryGrid.innerHTML = 'Carregando memórias...'; // Mensagem de carregamento

    try {
        // Chamada à Netlify Function para obter as memórias
        const response = await fetch('/.netlify/functions/get-memories');
        const data = await response.json();

        if (response.ok) {
            memoryGrid.innerHTML = ''; // Limpa a mensagem de carregamento
            // Ordena as memórias pela data do evento (mais recente primeiro)
            const sortedMemories = data.records.sort((a, b) => {
                const dateA = new Date(a.fields.eventDate);
                const dateB = new Date(b.fields.eventDate);
                return dateB - dateA; // Para ordem decrescente (mais recente primeiro)
            });
            sortedMemories.forEach(memory => createMemoryCard(memory));
            addPlayButtonListeners(); // Adiciona listeners aos botões de play
        } else {
            throw new Error(data.message || 'Erro ao carregar memórias.');
        }
    } catch (error) {
        console.error('Erro ao carregar memórias:', error);
        memoryGrid.innerHTML = `<p class="message error">Erro ao carregar memórias: ${error.message}. Tente novamente mais tarde.</p>`;
    }
}

// Adiciona listeners aos botões de play/pause
function addPlayButtonListeners() {
    document.querySelectorAll('.play-button').forEach(button => {
        button.onclick = function() {
            const videoId = this.dataset.videoId;

            // Se já tem um player e é a mesma música, pausa/retoma
            if (player && player.videoId === videoId) {
                if (player.getPlayerState() === 1) { // 1 = playing
                    player.pauseVideo();
                    this.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg> Tocar Música';
                } else {
                    player.playVideo();
                    this.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pausar Música';
                }
            } else {
                // Pausa a música anterior, se houver
                if (player) {
                    player.stopVideo();
                    if (currentPlayingButton) {
                        currentPlayingButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg> Tocar Música';
                    }
                }

                // Cria ou carrega o novo player
                player = new YT.Player('player', {
                    height: '0', // Deixa invisível
                    width: '0', // Deixa invisível
                    videoId: videoId,
                    events: {
                        'onReady': (event) => {
                            event.target.playVideo();
                            currentPlayingButton = this;
                            this.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pausar Música';
                        },
                        'onStateChange': (event) => {
                            if (event.data === YT.PlayerState.ENDED) {
                                if (currentPlayingButton) {
                                    currentPlayingButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg> Tocar Música';
                                }
                            }
                        }
                    }
                });
            }
        };
    });
}


// Lógica do Formulário de Adição de Memória
document.addEventListener('DOMContentLoaded', () => {
    loadMemories(); // Carrega as memórias ao iniciar

    const addMemoryForm = document.getElementById('addMemoryForm');
    const formMessage = document.getElementById('formMessage');

    addMemoryForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        formMessage.textContent = 'Adicionando memória...';
        formMessage.className = 'message'; // Remove classes de erro/sucesso anteriores

        const photoFile = document.getElementById('photoFile').files[0];
        const title = document.getElementById('title').value;
        const text = document.getElementById('text').value;
        const youtubeUrl = document.getElementById('youtubeUrl').value;
        const eventDate = document.getElementById('eventDate').value; // Formato YYYY-MM-DD

        if (!photoFile || !title || !youtubeUrl || !eventDate) {
            formMessage.textContent = 'Por favor, preencha todos os campos obrigatórios.';
            formMessage.classList.add('error');
            return;
        }

        try {
            // 1. Upload da Imagem para o Cloudinary
            const cloudinaryUploadUrl = 'https://api.cloudinary.com/v1_1/SEU_CLOUD_NAME/image/upload'; // ATENÇÃO: Substitua SEU_CLOUD_NAME pelo seu Cloud Name do Cloudinary!
            const formData = new FormData();
            formData.append('file', photoFile);
            formData.append('upload_preset', 'SEU_UPLOAD_PRESET'); // ATENÇÃO: Você precisará criar um "Upload Preset" no Cloudinary!

            // Configurações de upload para Cloudinary (sem API Secret no frontend)
            // É essencial criar um Upload Preset **sem** "Signed Uploads" para upload direto do frontend.
            // Para mais segurança, o ideal seria que o upload para o Cloudinary fosse feito via Netlify Function também,
            // mas isso complicaria o tratamento de arquivos no Netlify Function.
            // Para este projeto, vamos usar o upload direto com Upload Preset.

            const uploadResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: formData,
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(uploadData.error.message || 'Erro ao fazer upload da imagem para o Cloudinary.');
            }

            const photoURL = uploadData.secure_url; // URL da imagem salva no Cloudinary

            // 2. Enviar dados (incluindo URL da imagem) para a Netlify Function
            const memoryData = {
                photoURL,
                title,
                text,
                youtubeURL,
                eventDate
            };

            const saveResponse = await fetch('/.netlify/functions/create-memory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memoryData)
            });

            const saveData = await saveResponse.json();

            if (saveResponse.ok) {
                formMessage.textContent = 'Memória adicionada com sucesso!';
                formMessage.classList.add('success');
                addMemoryForm.reset(); // Limpa o formulário
                loadMemories(); // Recarrega as memórias para exibir a nova
            } else {
                throw new Error(saveData.message || 'Erro ao salvar memória no banco de dados.');
            }

        } catch (error) {
            console.error('Erro ao adicionar memória:', error);
            formMessage.textContent = `Falha ao adicionar memória: ${error.message}`;
            formMessage.classList.add('error');
        }
    });
});