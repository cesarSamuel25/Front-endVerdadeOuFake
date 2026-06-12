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

        // Se deu tudo certo, chama a função para renderizar as alegações na tela
        renderResults(data);

    } catch (error) {
        // --- POP-UP DE ALERTA DE CONEXÃO/API ---
        alert("Não foi possível acessar o serviço de checagem. Verifique sua conexão ou tente novamente mais tarde.");
        
        // Limpa o carregamento antigo e renderiza a falha corrigida ortograficamente
        resultsContainer.innerHTML = '<p>Nenhuma busca realizada ainda.</p>';
        messageContainer.innerText = error.message || "Falha na requisição: Endereço da API inacessível.";
        
        console.error("Erro detalhado do servidor:", error);
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

    // Validação extra caso a lista venha nula ou vazia
    if (!data.claims || data.claims.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum resultado retornado do serviço de checagem.</p>';
        return;
    }

    // Cria uma lista ordenada (ol) para agrupar as alegações encontradas
    const ol = document.createElement('ol');

    data.claims.forEach(claim => {
        const li = document.createElement('li');
        
        // --- CORREÇÃO CONTRA UNDEFINED: Fallbacks de segurança para a Claim ---
        const textClaim = claim.text ? claim.text : 'Texto da alegação não fornecido';
        const claimant = claim.claimant ? claim.claimant : 'Autor desconhecido';
        
        // Trata a data da alegação para o formato brasileiro (DD/MM/AAAA)
        const claimDate = claim.claimDate 
            ? new Date(claim.claimDate).toLocaleDateString('pt-BR') 
            : 'Data não informada';

        // Monta a estrutura inicial com o texto da mentira/verdade e quem falou (Garantindo variáveis seguras)
        let claimHtml = `
            <p><strong>Alegação investigada:</strong> "${textClaim}"</p>
            <p><strong>Quem disse:</strong> ${claimant} (Data: ${claimDate})</p>
        `;

        // Se houver revisões de agências de checagem dentro da claim, renderiza a sublista
        if (claim.claimReview && claim.claimReview.length > 0) {
            claimHtml += `<strong>Análise das agências de Fact-Checking:</strong><ul>`;
            
            claim.claimReview.forEach(review => {
                // --- CORREÇÃO CONTRA UNDEFINED: Fallbacks internos do claimReview ---
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

        // Insere o bloco de texto montado dentro do item da lista
        li.innerHTML = claimHtml;
        ol.appendChild(li);
    });

    // Injeta a lista completa com todas as checagens no container principal da tela
    resultsContainer.appendChild(ol);
}
