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
    event.preventDefault(); 

    const queryValue = queryInput.value.trim();
    if (!queryValue) return;

    resultsContainer.innerHTML = 'Buscando dados na API externa na nuvem...';
    messageContainer.innerText = '';
    
    searchButton.disabled = true;
    queryInput.disabled = true;

    try {
        const url = new URL(API_URL);
        url.searchParams.append('query', queryValue);

        console.log("🌐 Disparando requisição HTTP GET para:", url.href);

        const response = await fetch(url);
        
        if (!response.ok) {
            let errorMsg = 'Ocorreu um erro inesperado no servidor em nuvem.';
            try {
                const data = await response.json();
                errorMsg = data.detail?.mensagem || errorMsg;
            } catch(e) { }
            
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("📦 DADOS BRUTOS RECEBIDOS DA API (RAILWAY):", data);

        renderResults(data);

    } catch (error) {
        alert("Não foi possível acessar o serviço de checagem. Verifique sua conexão ou tente novamente mais tarde.");
        resultsContainer.innerHTML = '<p>Nenhuma busca realizada ainda.</p>';
        messageContainer.innerText = error.message || "Falha na requisição: Endereço da API inacessível.";
        console.error("❌ Erro detalhado capturado no fluxo:", error);
    } finally {
        searchButton.disabled = false;
        queryInput.disabled = false;
        queryInput.focus();
    }
});

/**
 * Função responsável por construir o HTML dinamicamente com base nos dados recebidos da API
 */
function renderResults(data) {
    resultsContainer.innerHTML = ''; 

    if (!data.claims || data.claims.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum resultado retornado do serviço de checagem.</p>';
        return;
    }

    const ol = document.createElement('ol');

    data.claims.forEach(item => {
        const li = document.createElement('li');
        
        // Mapeamento das chaves REAIS entregues pelo seu modelo no backend (Railway)
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

        let claimHtml = `
            <p><strong>Alegação investigada:</strong> "${textClaim}"</p>
            <p><strong>Veredito do Modelo:</strong> ${statusTag}</p>
            <p><strong>Fonte do veredito:</strong> 🤖 Mapeado via <em>${fonte}</em></p>
        `;

        if (confiancaFalso !== null && confiancaVerdadeiro !== null) {
            claimHtml += `
                <strong>Métricas de Certeza da IA:</strong>
                <ul>
                    <li>Probabilidade de ser Falso: <strong>${confiancaFalso}%</strong></li>
                    <li>Probabilidade de ser Verdadeiro: <strong>${confiancaVerdadeiro}%</strong></li>
                </ul>
            `;
        }

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

        li.innerHTML = claimHtml;
        ol.appendChild(li);
    });

    resultsContainer.appendChild(ol);
}
