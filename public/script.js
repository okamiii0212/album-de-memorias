document.addEventListener('DOMContentLoaded', () => {
    const memoryForm = document.getElementById('memoryForm');
    const memoriesList = document.getElementById('memoriesList');
    const imageUpload = document.getElementById('imageUpload');
    const youtubeLink = document.getElementById('youtubeLink'); // Novo campo
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const loadingMessage = document.getElementById('loadingMessage'); // Adicionado

    // Função para exibir mensagens temporariamente
    function showMessage(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
            element.textContent = '';
        }, 5000); // Mensagem some após 5 segundos
    }

    // Função para carregar e exibir as memórias
    async function loadMemories() {
        memoriesList.innerHTML = ''; // Limpa a lista antes de carregar
        showMessage(loadingMessage, 'Carregando memórias...'); // Exibe mensagem de carregamento

        try {
            const response = await fetch('/.netlify/functions/get-memories');
            const data = await response.json();

            if (data.success && data.memories) {
                if (data.memories.length === 0) {
                    memoriesList.innerHTML = '<p>Nenhuma memória encontrada. Adicione a primeira!</p>';
                } else {
                    data.memories.forEach(memory => {
                        const memoryDiv = document.createElement('div');
                        memoryDiv.className = 'memory-item';
                        memoryDiv.innerHTML = `
                            <h3>${memory.title}</h3>
                            <p>${memory.text}</p>
                            ${memory.imageUrl ? `<img src="${memory.imageUrl}" alt="${memory.title}" class="memory-image">` : ''}
                            ${memory.youtubeUrl ? `
                                <div class="youtube-video">
                                    <iframe
                                        src="https://www.youtube.com/embed/${getYouTubeVideoId(memory.youtubeUrl)}"
                                        frameborder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowfullscreen>
                                    </iframe>
                                </div>
                            ` : ''}
                            <p><small>Data: ${new Date(memory.date).toLocaleDateString('pt-BR')}</small></p>
                        `;
                        memoriesList.appendChild(memoryDiv);
                    });
                }
                showMessage(loadingMessage, ''); // Esconde mensagem de carregamento
            } else {
                showMessage(errorMessage, `Erro ao carregar memórias: ${data.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao carregar memórias:', error);
            showMessage(errorMessage, 'Erro de rede ao carregar memórias. Tente novamente.');
        } finally {
            loadingMessage.style.display = 'none'; // Garante que a mensagem de loading desapareça
        }
    }

    // Função auxiliar para extrair o ID do vídeo do YouTube
    function getYouTubeVideoId(url) {
        const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    }


    // Event listener para o formulário de adição de memória
    memoryForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        const title = document.getElementById('title').value;
        const text = document.getElementById('text').value;
        const date = document.getElementById('date').value;
        const file = imageUpload.files[0];
        const rawYoutubeUrl = youtubeLink.value; // Pega o link bruto
        const youtubeId = getYouTubeVideoId(rawYoutubeUrl); // Extrai o ID

        if (!title || !text || !date) {
            showMessage(errorMessage, 'Por favor, preencha Título, Texto e Data.');
            return;
        }

        showMessage(loadingMessage, 'Adicionando memória...'); // Exibe mensagem de carregamento

        let imageUrl = '';

        // Se uma imagem foi selecionada, faça o upload para o Cloudinary
        if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                // ATENÇÃO: O nome do seu Upload Preset no Cloudinary.
                // Confirmamos que é 'meu_album_upload'
                formData.append('upload_preset', 'meu_album_upload'); 
                formData.append('cloud_name', 'dbdehvjd3'); // Substitua pelo SEU Cloud Name do Cloudinary

                const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/dbdehvjd3/image/upload`, { // Substitua pelo SEU Cloud Name
                    method: 'POST',
                    body: formData
                });

                const cloudinaryData = await cloudinaryResponse.json();
                if (cloudinaryData.secure_url) {
                    imageUrl = cloudinaryData.secure_url;
                } else {
                    showMessage(errorMessage, 'Erro ao fazer upload da imagem para o Cloudinary.');
                    console.error('Erro Cloudinary:', cloudinaryData);
                    loadingMessage.style.display = 'none';
                    return;
                }
            } catch (error) {
                console.error('Erro no upload Cloudinary:', error);
                showMessage(errorMessage, 'Erro de rede ao enviar imagem. Tente novamente.');
                loadingMessage.style.display = 'none';
                return;
            }
        }

        // Envia os dados da memória para a Netlify Function
        try {
            const response = await fetch('/.netlify/functions/create-memory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    text,
                    date,
                    imageUrl, // Envia a URL da imagem (pode ser vazia)
                    youtubeUrl: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '' // Envia o link formatado
                }),
            });

            const data = await response.json();

            if (data.success) {
                showMessage(successMessage, 'Memória adicionada com sucesso!');
                memoryForm.reset(); // Limpa o formulário
                loadMemories(); // Recarrega a lista para mostrar a nova memória
            } else {
                showMessage(errorMessage, `Erro ao adicionar memória: ${data.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao adicionar memória:', error);
            showMessage(errorMessage, 'Erro de rede ao adicionar memória. Tente novamente.');
        } finally {
            loadingMessage.style.display = 'none'; // Garante que a mensagem de loading desapareça
        }
    });

    // Carrega as memórias ao iniciar a página
    loadMemories();
});