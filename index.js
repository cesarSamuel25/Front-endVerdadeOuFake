// ==========================================
// CONFIGURAÇÃO: URL da sua API na nuvem (Railway)
// ==========================================
const API_URL = 'https://verdadeoufake-production.up.railway.app/fact-check/claims/search';

// Seleção dos elementos do DOM
const searchForm = document.getElementById('searchForm');
const queryInput = document.getElementById('queryInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('resultsContainer');
const messageContainer = document.getElementById('messageContainer');

// Ouvinte de evento para o envio do formulário
searchForm.addEventListener('submit', async (event) => {
    // 1. GATILHO IMEDIATO: Cancela o recarregamento antes de rodar qualquer lógica
    event.preventDefault(); 

    const queryValue = queryInput.value.trim();

    // Se o usuário tentar enviar o campo em branco, ignora a busca
    if (!queryValue) return;

    // Limpa os estados anteriores antes de começar a nova requisição
    resultsContainer.innerHTML = 'Buscando dados na API externa na nuvem...';
    messageContainer.innerText = '';
    
    // Desabilita o botão e o input para evitar cliques duplos enquanto espera o servidor
    searchButton.disabled = true;
    queryInput.disabled = true;

    try {
        // Constrói a URL injetando o query param de forma segura usando o objeto URL nativo
        const url = new URL(API_URL);
        url.searchParams.append('query', queryValue);

        console.log("🌐 Disparando requisição HTTP GET para:", url.href);

        // Faz a chamada GET para o backend hospedado na nuvem
        const response = await fetch(url);
        
        // Se o status HTTP não for de sucesso (2xx), extrai o erro do backend ou joga o padrão
        if (!response.ok) {
            let errorMsg = 'Ocorreu um erro inesperado no servidor em nuvem.';
            try {
                const data = await response.json();
                errorMsg = data.detail?.mensagem || errorMsg;
            } catch(e) { /* Proteção caso o servidor envie HTML em vez de JSON */ }
            
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Exibe o objeto completo e interativo no console (F12) para auditoria
        console.log("📦 DADOS BRUTOS RECEBIDOS DA API (RAILWAY):", data);

        // Se deu tudo certo, chama a função para renderizar as alegações na tela
        renderResults(data);

    } catch (error) {
        // --- POP-UP DE ALERTA DE CONEXÃO/API ---
        alert("Não foi possível acessar o serviço de checagem. Verifique sua conexão ou tente novamente mais tarde.");
        
        // Limpa o carregamento antigo e preenche o container de erros
        resultsContainer.innerHTML = '<p>Nenhuma busca realizada ainda.</p>';
        messageContainer.innerText = error.message || "Falha na requisição: Endereço da API inacessível.";
        
        console.error("❌ Erro detalhado capturado no fluxo:", error);
    } finally {
        // Sempre reativa os controles da tela ao finalizar (com sucesso ou erro)
        searchButton.disabled = false;
        queryInput.disabled = false;
        queryInput.focus();
    }
});

/**
 * Função responsável por construir o HTML dinamicamente com base nos dados recebidos da API
 */
function renderResults(data) {
    resultsContainer.innerHTML = ''; // Limpa o texto de carregamento

    // Validação caso a lista venha nula ou vazia
    if (!data.claims || data.claims.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum resultado retornado do serviço de checagem.</p>';
        return;
    }

    // Cria uma lista ordenada (ol) para agrupar as alegações encontradas
    const ol = document.createElement('ol');

    data.claims.forEach(item => {
        const li = document.createElement('li');
        
        // Mapeamento das chaves REAIS entregues pelo seu modelo no backend
        const textClaim = item.claim ? item.claim : 'Texto da alegação não fornecido';
        const resultado = item.resultado ? item.resultado : 'Sem veredito';
        const fonte = item.fonte ? item.fonte : 'Desconhecida';
        
        // Formata as taxas decimais de confiança para porcentagem legível (Ex: 0.898 -> 89.8%)
        const confiancaFalso = item.confianca_falso ? (item.confianca_falso * 100).toFixed(1) : null;
        const confiancaVerdadeiro = item.confianca_verdadeiro ? (item.confianca_verdadeiro * 100).toFixed(1) : null;

        // Trata dinamicamente o visual do resultado com base no retorno textual
        let statusTag = '❓ SEM VEREDITO';
        if (resultado.toLowerCase() === 'falso') {
            statusTag = '<span style="color: red; font-weight: bold;">❌ FALSO</span>';
        } else if (resultado.toLowerCase() === 'verdadeiro') {
            statusTag = '<span style="color: green; font-weight: bold;">✅ VERDADEIRO</span>';
        }

        // Monta o bloco inicial de informações da alegação
        let claimHtml = `
            <p><strong>Alegação investigada:</strong> "${textClaim}"</p>
            <p><strong>Veredito do Modelo:</strong> ${statusTag}</p>
            <p><strong>Fonte do veredito:</strong> 🤖 Mapeado via <em>${fonte}</em></p>
        `;

        // Se o modelo disponibilizar os scores de probabilidade, exibe na tela
        if (confiancaFalso !== null && confiancaVerdadeiro !== null) {
            claimHtml += `
                <strong>Métricas de Certeza da IA:</strong>
                <ul>
                    <li>Probabilidade de ser Falso: <strong>${confiancaFalso}%</strong></li>
                    <li>Probabilidade de ser Verdadeiro: <strong>${confiancaVerdadeiro}%</strong></li>
                </ul>
            `;
        }

        // Bloco de fallback caso a resposta possua a lista clássica do Google Fact-Checking
        if (item.claimReview && item.claimReview.length > 0) {
            claimHtml += `<br><strong>Análise das agências (Google API):</strong><ul>`;
            item.claimReview.forEach(review => {
                const textualRating = review.textualRating ? review.textualRating : 'Sem classificação';
                const publisherName = (review.publisher && review.publisher.name) ? review.publisher.name : 'Agência anônima';
                const reviewTitle = review.title ? review.title : 'Ler artigo original';
                const reviewUrl = review.url ? review.url : '#';

                claimHtml += `
                    <li>
                        <p><strong>Veredito:</strong> <em>${textualRating}</em></p>
                        <p><strong>Agência:</strong> <a href="${reviewUrl}" target="_blank">${publisherName}</a></p>
                        <p><strong>Artigo:</strong> <a href="${reviewUrl}" target="_blank">${reviewTitle}</a></p>
                    </li>
                `;
            });
            claimHtml += `</ul>`;
        }

        // Injeta o bloco montado na tag 'li' e anexa à lista principal
        li.innerHTML = claimHtml;
        ol.appendChild(li);
    });

    // Atualiza a tela exibindo os blocos processados
    resultsContainer.appendChild(ol);
}
