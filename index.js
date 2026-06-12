// TESTE 1: Isso DEVE aparecer no console assim que você atualizar a página
console.log("✅ O arquivo app.js foi carregado com sucesso pelo navegador!");

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

// Verificação se os elementos existem no HTML
if (!searchForm) console.error("❌ ERRO: O elemento #searchForm não foi encontrado no HTML. Verifique os IDs.");
if (!queryInput) console.error("❌ ERRO: O elemento #queryInput não foi encontrado no HTML. Verifique os IDs.");

// Ouvinte de evento para o envio do formulário
searchForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const queryValue = queryInput.value.trim();
    
    // TESTE 2: Isso DEVE aparecer quando você clicar no botão buscar
    console.log("🔍 Botão de busca clicado! Termo pesquisado:", queryValue);

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

        // =====================================================================
        // TESTE 3: ESSE É O LOG PRINCIPAL QUE VOCÊ QUER VER
        // =====================================================================
        printJsonInConsole(data);

        renderResults(data);

    } catch (error) {
        alert("Não foi possível acessar o serviço de checagem.");
        resultsContainer.innerHTML = '<p>Nenhuma busca realizada ainda.</p>';
        messageContainer.innerText = error.message || "Falha na requisição.";
        console.error("❌ Erro capturado no fluxo:", error);
    } finally {
        searchButton.disabled = false;
        queryInput.disabled = false;
        queryInput.focus();
    }
});

/**
 * Função auxiliar para isolar o log do JSON de forma limpa e visível
 */
function printJsonInConsole(data) {
    console.log("==========================================");
    console.log("📦 DADOS BRUTOS RECEBIDOS DA API (RAILWAY):");
    console.log(data); // Exibe o objeto interativo para você expandir
    console.log("==========================================");
}

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

    data.claims.forEach(claim => {
        const li = document.createElement('li');
        
        const textClaim = claim.text ? claim.text : 'Texto da alegação não fornecido';
        const claimant = claim.claimant ? claim.claimant : 'Autor desconhecido';
        
        const claimDate = claim.claimDate 
            ? new Date(claim.claimDate).toLocaleDateString('pt-BR') 
            : 'Data não informada';

        let claimHtml = `
            <p><strong>Alegação investigada:</strong> "${textClaim}"</p>
            <p><strong>Quem disse:</strong> ${claimant} (Data: ${claimDate})</p>
        `;

        if (claim.claimReview && claim.claimReview.length > 0) {
            claimHtml += `<strong>Análise das agências de Fact-Checking:</strong><ul>`;
            
            claim.claimReview.forEach(review => {
                const textualRating = review.textualRating ? review.textualRating : 'Sem classificação';
                const publisherName = (review.publisher && review.publisher.name) ? review.publisher.name : 'Agência anônima';
                const publisherSite = (review.publisher && review.publisher.site) ? review.publisher.site : '#';
                const reviewTitle = review.title ? review.title : 'Ler artigo original';
                const language = review.languageCode ? review.languageCode.toUpperCase() : 'N/A';
                const reviewUrl = review.url ? review.url : '#';

                claimHtml += `
                    <li>
                        <p><strong>Veredito:</strong> 🚨 <em>${textualRating}</em></p>
                        <p><strong>Agência:</strong> <a href="${publisherSite}" target="_blank">${publisherName}</a></p>
                        <p><strong>Checagem completa:</strong> <a href="${reviewUrl}" target="_blank">${reviewTitle}</a></p>
                        <p><strong>Idioma da checagem:</strong> ${language}</p>
                    </li>
                    <br>
                `;
            });
            
            claimHtml += `</ul>`;
        } else {
            claimHtml += `<p><em>Nenhuma análise detalhada disponível para esta alegação.</em></p>`;
        }

        li.innerHTML = claimHtml;
        ol.appendChild(li);
    });

    resultsContainer.appendChild(ol);
}
