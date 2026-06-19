// Módulo Processador de Planilhas e Relatórios (parser.js)
// Responsável por ler planilhas (XLSX, CSV) e relatórios copiados em texto puro.

class ReportParser {
    // Normaliza texto removendo acentos, espaços extras e convertendo para minúsculas
    static _normalize(text) {
        if (!text) return "";
        return text.toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove acentos
            .replace(/[^a-z0-9\s]/g, "")    // remove caracteres especiais
            .trim();
    }

    // Busca o posto mais provável na base pelo nome do posto relatado
    static findPostByFuzzyName(relatadoName, posts) {
        const normRelatado = this._normalize(relatadoName);
        if (!normRelatado) return null;

        let bestMatch = null;
        let highestScore = 0;

        for (const post of posts) {
            const normPostName = this._normalize(post.nome);
            const normBairro = this._normalize(post.bairro);

            // Match exato
            if (normPostName === normRelatado) {
                return post;
            }

            let score = 0;

            // Se o nome relatado contém o nome do posto ou vice-versa
            if (normPostName.includes(normRelatado) || normRelatado.includes(normPostName)) {
                score += 50;
            }

            // Fazer correspondência por tokens (palavras individuais)
            const wordsRelatado = normRelatado.split(/\s+/);
            const wordsPost = normPostName.split(/\s+/);
            
            let matchingWords = 0;
            wordsRelatado.forEach(w => {
                if (w.length > 2 && wordsPost.includes(w)) {
                    matchingWords++;
                }
            });

            score += (matchingWords / Math.max(wordsRelatado.length, wordsPost.length)) * 50;

            // Bônus se o bairro for mencionado
            if (normRelatado.includes(normBairro)) {
                score += 20;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = post;
            }
        }

        // Retorna o match apenas se o score de confiança for aceitável (ex: maior que 35)
        return highestScore > 35 ? bestMatch : null;
    }

    // Processa o arquivo Excel usando SheetJS (recebe a pasta de trabalho de leitura do browser)
    static parseExcel(workbook, posts) {
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Converte planilha em matriz de linhas/colunas
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        return this.parseArrayData(rawData, posts);
    }

    // Processa dados de CSV formatados como linhas e colunas de texto
    static parseCSV(csvText, posts) {
        const rows = csvText.split(/\r?\n/).map(row => {
            // Separação simples por vírgula ou ponto-e-vírgula
            const delimiter = row.includes(';') ? ';' : ',';
            return row.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        });
        return this.parseArrayData(rows.filter(r => r.length > 0 && r.some(c => c !== "")), posts);
    }

    // Processa a matriz bidimensional de dados (comum para XLSX e CSV)
    static parseArrayData(rows, posts) {
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => this._normalize(h));
        
        // Identificar índices das colunas importantes
        const colIndexes = {
            posto: headers.findIndex(h => h.includes('posto') || h.includes('local') || h.includes('cliente') || h.includes('nome')),
            tipo: headers.findIndex(h => h.includes('tipo') || h.includes('ocorrencia') || h.includes('evento') || h.includes('alerta')),
            colaborador: headers.findIndex(h => h.includes('colaborador') || h.includes('vigilante') || h.includes('funcionario') || h.includes('nome')),
            detalhes: headers.findIndex(h => h.includes('detalhe') || h.includes('motivo') || h.includes('observacao') || h.includes('descricao')),
            data: headers.findIndex(h => h.includes('data') || h.includes('periodo'))
        };

        // Se não encontrar os cabeçalhos de forma estruturada, tentamos mapear por heurística
        const dataRows = rows.slice(1);
        const ocorrenciasDetectadas = [];

        dataRows.forEach((row, index) => {
            if (row.length === 0 || row.every(c => c === "" || c == null)) return;

            let postoTexto = "";
            let tipoTexto = "";
            let colaborador = "";
            let detalhes = "";
            let dataStr = new Date().toISOString().split('T')[0];

            if (colIndexes.posto !== -1) postoTexto = row[colIndexes.posto];
            if (colIndexes.tipo !== -1) tipoTexto = row[colIndexes.tipo];
            if (colIndexes.colaborador !== -1) colaborador = row[colIndexes.colaborador];
            if (colIndexes.detalhes !== -1) detalhes = row[colIndexes.detalhes];
            if (colIndexes.data !== -1 && row[colIndexes.data]) {
                // Tenta formatar data Excel
                const rawDate = row[colIndexes.data];
                if (!isNaN(rawDate) && typeof rawDate === 'number') {
                    // Data serial do Excel
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                    const date = new Date(excelEpoch.getTime() + rawDate * 24 * 60 * 60 * 1000);
                    dataStr = date.toISOString().split('T')[0];
                } else {
                    dataStr = rawDate.toString();
                }
            }

            // Heurística de fallback: se colunas não mapeadas, pega células das primeiras posições
            if (!postoTexto && row[0]) postoTexto = row[0];
            if (!tipoTexto && row[1]) tipoTexto = row[1];
            if (!detalhes && row[2]) detalhes = row[2];

            // Tenta casar o posto na base
            const matchingPost = this.findPostByFuzzyName(postoTexto, posts);
            
            // Tenta determinar o tipo de ocorrência
            let tipo = 'observacao';
            let severidade = 'baixa';
            const normTipo = this._normalize(tipoTexto) + " " + this._normalize(detalhes);

            if (normTipo.includes('falta') || normTipo.includes('ausente') || normTipo.includes('nao compareceu') || normTipo.includes('atestado')) {
                tipo = 'falta';
                severidade = 'alta';
            } else if (normTipo.includes('demissa') || normTipo.includes('deslig') || normTipo.includes('aviso previo') || normTipo.includes('saida')) {
                tipo = 'demissao';
                severidade = 'alta';
            } else if (normTipo.includes('admissao') || normTipo.includes('contratacao') || normTipo.includes('entrada') || normTipo.includes('novo')) {
                tipo = 'admissao';
                severidade = 'baixa';
            } else if (normTipo.includes('ordem') || normTipo.includes('servico') || normTipo.includes('os') || normTipo.includes('solicitacao') || normTipo.includes('ronda') || normTipo.includes('apoio')) {
                tipo = 'os';
                severidade = 'media';
            }

            if (matchingPost) {
                ocorrenciasDetectadas.push({
                    rowNumber: index + 2,
                    postoNome: matchingPost.nome,
                    postId: matchingPost.id,
                    tipo: tipo,
                    colaborador: colaborador || 'Não especificado',
                    detalhes: detalhes || `Importado via relatório. Origem: "${tipoTexto || 'Ocorrência'}"`,
                    data: dataStr,
                    severidade: severidade,
                    confidence: 'alta'
                });
            } else if (postoTexto) {
                // Posto não encontrado, mas relatado
                ocorrenciasDetectadas.push({
                    rowNumber: index + 2,
                    postoNome: postoTexto,
                    postId: null, // Indicará que precisa de vinculação manual
                    tipo: tipo,
                    colaborador: colaborador || 'Não especificado',
                    detalhes: detalhes || `Posto não cadastrado: "${postoTexto}". Ocorrência: "${tipoTexto}"`,
                    data: dataStr,
                    severidade: severidade,
                    confidence: 'nenhuma'
                });
            }
        });

        return ocorrenciasDetectadas;
    }

    // Processa texto bruto copiado de PDF ou digitado diretamente
    static parseRawText(text, posts) {
        if (!text) return [];

        const lines = text.split(/\n/);
        const ocorrenciasDetectadas = [];

        // Termos chave de corte
        const keywords = {
            falta: ['falta', 'faltou', 'ausente', 'atestado', 'escala desfalca', 'nao compareceu'],
            demissao: ['demissao', 'demitiu', 'desligamento', 'aviso previo', 'demitido'],
            admissao: ['admissao', 'admitiu', 'contratacao', 'entrada', 'novo colaborador'],
            os: ['ordem de servico', 'os ', 'solicitou ronda', 'ronda extra', 'evento', 'servico de apoio']
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length < 10) return; // ignora linhas vazias ou muito curtas

            const normLine = this._normalize(trimmedLine);
            
            // Procura se algum posto é mencionado na linha
            let matchingPost = null;
            let bestNameMatch = "";

            // Procurar correspondência de posts na linha
            for (const post of posts) {
                const normPostName = this._normalize(post.nome);
                const normBairro = this._normalize(post.bairro);

                // Se o nome do posto ou bairro é citado na linha
                if (normLine.includes(normPostName) || (normLine.includes(this._normalize(post.nome.split(' - ')[0])) && normLine.includes(normBairro))) {
                    if (post.nome.length > bestNameMatch.length) {
                        matchingPost = post;
                        bestNameMatch = post.nome;
                    }
                }
            }

            // Se encontrou posto, determina a ocorrência na linha
            if (matchingPost) {
                let tipo = 'observacao';
                let severidade = 'baixa';

                const isFalta = keywords.falta.some(k => normLine.includes(k));
                const isDemissao = keywords.demissao.some(k => normLine.includes(k));
                const isAdmissao = keywords.admissao.some(k => normLine.includes(k));
                const isOS = keywords.os.some(k => normLine.includes(k));

                if (isFalta) {
                    tipo = 'falta';
                    severidade = 'alta';
                } else if (isDemissao) {
                    tipo = 'demissao';
                    severidade = 'alta';
                } else if (isAdmissao) {
                    tipo = 'admissao';
                    severidade = 'baixa';
                } else if (isOS) {
                    tipo = 'os';
                    severidade = 'media';
                }

                // Tenta pescar um nome de vigilante/colaborador (padrão "Vigilante X" ou "colaborador X")
                let colaborador = 'Não especificado';
                const colabMatch = trimmedLine.match(/(?:vigilante|colaborador|guarda|inspetor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
                if (colabMatch) {
                    colaborador = colabMatch[1];
                }

                ocorrenciasDetectadas.push({
                    rowNumber: index + 1,
                    postoNome: matchingPost.nome,
                    postId: matchingPost.id,
                    tipo: tipo,
                    colaborador: colaborador,
                    detalhes: trimmedLine,
                    data: new Date().toISOString().split('T')[0],
                    severidade: severidade,
                    confidence: 'alta'
                });
            }
        });

        return ocorrenciasDetectadas;
    }
}

window.ReportParser = ReportParser;
