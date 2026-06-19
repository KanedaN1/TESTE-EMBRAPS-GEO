// Motor do Analista Operacional de IA (ai.js)
// Processa perguntas em linguagem natural e gera relatórios interativos baseados no estado do banco de dados.

class AIOperationalAnalyst {
    // Calcula distância em KM entre dois pontos geográficos (Fórmula de Haversine)
    static _getDistanceKM(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Normaliza texto para busca simples de palavras-chave
    static _normalize(text) {
        if (!text) return "";
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    // Processa uma pergunta livre em português e gera uma resposta dinâmica
    static async processQuery(queryText) {
        const posts = await DatabaseService.getPosts();
        const incidents = await DatabaseService.getIncidents();
        const supervisors = await DatabaseService.getSupervisores();
            // Envia a requisição para a nossa Serverless Function na Vercel (onde a chave está escondida)
        try {
            return await this._callGeminiAPI(queryText, posts, incidents, supervisors);
        } catch (e) {
            console.error("Erro na chamada Gemini API (via Vercel Proxy):", e);
            const localResponse = await this._localProcess(this._normalize(queryText), posts, incidents, supervisors, queryText);
            return `> [!WARNING]
> **Erro na IA Gemini**: ${e.message}.
> Operando temporariamente no modo analista local off-line.

${localResponse}`;
        }
    }

    // Processador de Regras Local (Offline)
    static async _localProcess(normalized, posts, incidents, supervisors, rawQuery) {
        
        // 0. Parser NLP para registros diretos: "acqua play - 5 faltas - 2 demis"
        const regexNLP = /(.*?)\s*-\s*(\d+)\s*falta[s]?\s*-\s*(\d+)\s*demi/i;
        const match = rawQuery.match(regexNLP);
        if (match) {
            const postoNomeRegex = match[1].trim();
            const numFaltas = parseInt(match[2]);
            const numDemissoes = parseInt(match[3]);

            const p = posts.find(post => this._normalize(post.nome).includes(this._normalize(postoNomeRegex)));
            if (p) {
                // Register faltas and demissoes
                for(let i=0; i<numFaltas; i++) {
                    await DatabaseService.addIncident({
                        postId: p.id, tipo: 'falta', colaborador: 'Registro Automático', detalhes: 'Inserido via IA (Lote Diário)', supervisorId: p.daySupervisorId, severidade: 'alta'
                    });
                }
                for(let i=0; i<numDemissoes; i++) {
                    await DatabaseService.addIncident({
                        postId: p.id, tipo: 'demissao', colaborador: 'Registro Automático', detalhes: 'Inserido via IA (Lote Diário)', supervisorId: p.daySupervisorId, severidade: 'alta'
                    });
                }
                if (window.loadDataFunc) await window.loadDataFunc();
                return `✅ **Registrado com sucesso:**\nAdicionei **${numFaltas} faltas** e **${numDemissoes} demissões** para o posto <a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>. O mapa foi atualizado.`;
            } else {
                return `❌ **Erro:** Não consegui encontrar o posto "${postoNomeRegex}". Tente escrever o nome mais próximo do cadastro oficial.`;
            }
        }

        // 1. Relatório Estratégico Mensal
        if (normalized.includes('estrategic') || normalized.includes('padroe') || normalized.includes('mensal') || normalized.includes('historico')) {
            return this.generateStrategicActionPlan(posts, incidents, supervisors);
        }

        // 1.1 Relatório Semanal de Supervisores
        if (normalized.includes('semanal') && (normalized.includes('supervisor') || normalized.includes('falta'))) {
            return this.generateWeeklySupervisorReport(posts, incidents, supervisors);
        }

        // 1.2 Simulação de Trânsito
        if (normalized.includes('transito') || normalized.includes('simulacao') || normalized.includes('simular')) {
            if (window.simulateTraffic) {
                window.simulateTraffic();
                return `🚗 **Simulação de Trânsito Ativada:**\nO mapa agora exibe uma simulação de tráfego intenso (linhas laranjas/vermelhas) entre as rotas dos supervisores (usando API base mockada, preparada para integração TomTom). O tempo de deslocamento aumentará.`;
            } else {
                return `🚗 **Simulação de Trânsito:**\nA camada de trânsito em tempo real necessita ser habilitada na interface principal do mapa (API TomTom/OSM).`;
            }
        }

        // 2. Relatório Geral / Resumo Executivo
        if (normalized.includes('resumo') || normalized.includes('relatorio geral') || normalized.includes('geral') || normalized.includes('como esta a operacao')) {
            return this.generateDailyReport(posts, incidents, supervisors);
        }

        // 2. Análise de Faltas
        if (normalized.includes('falta') || normalized.includes('ausente') || normalized.includes('atestado')) {
            // Verificar se o usuário quer plano de contingência específico
            if (normalized.includes('plano') || normalized.includes('contingencia') || normalized.includes('resolver') || normalized.includes('cobertura')) {
                return this.generateContingencyPlan(posts, incidents, supervisors);
            }
            return this.generateAbsenceReport(posts, incidents, supervisors);
        }

        // 3. Análise de Demissões
        if (normalized.includes('demissa') || normalized.includes('demissoes') || normalized.includes('desligamento') || normalized.includes('aviso previo')) {
            return this.generateDismissalReport(posts, incidents, supervisors);
        }

        // 4. Ordens de Serviço (OS)
        if (normalized.includes('ordem de servico') || normalized.includes('os ') || normalized.includes('servicos') || normalized.includes('ronda')) {
            return this.generateOSReport(posts, incidents, supervisors);
        }

        // 5. Pesquisa por Bairro específico
        let bairroDetectado = null;
        const bairrosConhecidos = [...new Set(posts.map(p => p.bairro))];
        for (const b of bairrosConhecidos) {
            if (normalized.includes(this._normalize(b))) {
                bairroDetectado = b;
                break;
            }
        }

        if (bairroDetectado) {
            return this.generateBairroReport(bairroDetectado, posts, incidents, supervisors);
        }

        // 6. Pesquisa por Supervisor específico
        let superDetectado = null;
        for (const s of supervisors) {
            const nomeCurto = s.nome.split(' ')[0]; // primeiro nome
            if (normalized.includes(this._normalize(nomeCurto))) {
                superDetectado = s;
                break;
            }
        }

        if (superDetectado) {
            return this.generateSupervisorReport(superDetectado, posts, incidents, supervisors);
        }

        // Resposta padrão (Instruções da IA)
        return `### Olá! Sou seu Analista de Operações IA. 📊

Analiso os postos ativos em Santos, cruzando com a agenda dos **17 supervisores** e as ocorrências do dia.

**Você pode me perguntar coisas como:**
* 📈 *"Análise estratégica"* (Mapeia padrões de faltas e rotatividade a longo prazo)
* 📋 *"Como está a operação hoje?"* (Gera um Resumo Executivo)
* 🚨 *"Quais são as faltas de hoje?"* ou *"Plano de contingência para as faltas"*
* 💼 *"Existem avisos de demissão pendentes?"*
* 🛠️ *"Quais são as ordens de serviço pendentes?"*
* 📍 *"Relatório do bairro Gonzaga"* (ou qualquer outro bairro de Santos)
* 👤 *"Como está a carteira de Carlos Silva?"* (ou o primeiro nome de outro supervisor)

Ou cole um texto de relatório operacional copiado do seu sistema para eu ler!`;
    }

    // GERAÇÃO DE RELATÓRIO ESTRATÉGICO MENSAL
    static generateStrategicActionPlan(posts, incidents, supervisors) {
        // Considerar todos os incidentes passados para o histórico
        const faltas = incidents.filter(i => i.type === 'falta');
        const demissoes = incidents.filter(i => i.type === 'demissao');
        const admissoes = incidents.filter(i => i.type === 'admissao');

        const totalFaltas = faltas.length;
        const totalDemissoes = demissoes.length;
        const totalAdmissoes = admissoes.length;

        // Distribuição de faltas por bairro
        const bairrosFalta = {};
        faltas.forEach(i => {
            const p = posts.find(post => post.id === i.postId);
            if (p) bairrosFalta[p.bairro] = (bairrosFalta[p.bairro] || 0) + 1;
        });
        const topBairrosFaltas = Object.entries(bairrosFalta).sort((a,b) => b[1] - a[1]).slice(0, 3);

        // Turnovers (Demissoes) por posto
        const postosDemissao = {};
        demissoes.forEach(i => {
            const p = posts.find(post => post.id === i.postId);
            if (p) postosDemissao[p.nome] = (postosDemissao[p.nome] || 0) + 1;
        });
        const topPostosDemissao = Object.entries(postosDemissao).sort((a,b) => b[1] - a[1]).slice(0, 3);

        return `### 📈 Análise Estratégica de Padrões Operacionais
Baseado no banco de dados histórico, identifiquei os seguintes padrões de comportamento:

* **Faltas Totais Registradas:** ${totalFaltas}
* **Demissões (Turnover):** ${totalDemissoes}
* **Admissões (Entradas):** ${totalAdmissoes}

---

#### 🔥 Zonas Críticas de Absenteísmo (Faltas):
${topBairrosFaltas.map(b => \`* **\${b[0]}**: \${b[1]} faltas registradas.\`).join('\\n') || '* Sem dados suficientes.'}

#### 💼 Postos com Maior Rotatividade (Demissões):
${topPostosDemissao.map(p => \`* **\${p[0]}**: \${p[1]} desligamentos/vagas.\`).join('\\n') || '* Sem dados suficientes.'}

---

#### 📋 Plano de Ação Recomendado (Gerado pela IA):
1. **Ação Geográfica:** Direcionar supervisores de apoio para a região de **${topBairrosFaltas.length > 0 ? topBairrosFaltas[0][0] : 'maior incidência'}** com foco em entrevistas de clima e controle de assiduidade.
2. **Reposição de Vagas:** Com **${totalAdmissoes} admissões** e **${totalDemissoes} demissões**, o saldo de contratações está ${totalAdmissoes >= totalDemissoes ? 'positivo/equilibrado' : 'negativo. Necessário intensificar os processos seletivos imediatos'}.
3. **Mapeamento Específico:** Verifique no mapa ativando o **Mapa de Calor (Padrões)** para visualizar com precisão as manchas de ocorrência nestas zonas.

*(Para uma análise mais profunda e personalizada baseada nestes dados, ative a API Key do Google Gemini nas configurações para gerar insights avançados de RH e Operações).*`;
    }

    // GERAÇÃO DE RELATÓRIO SEMANAL SUPERVISORES
    static generateWeeklySupervisorReport(posts, incidents, supervisors) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const weeklyFaltas = incidents.filter(i => {
            const d = new Date(i.data);
            const tipo = i.tipo || i.type;
            return d >= lastWeek && tipo === 'falta';
        });

        const counts = {};
        weeklyFaltas.forEach(i => {
            const post = posts.find(p => p.id === i.postId);
            if (!post) return;
            const supId = post.daySupervisorId || post.nightSupervisorId;
            if (supId) {
                counts[supId] = (counts[supId] || 0) + 1;
            }
        });

        const sortedSup = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
        if (sortedSup.length === 0) {
            return `### 📅 Relatório Semanal de Faltas por Supervisor\nNenhuma falta registrada na última semana.`;
        }

        let report = `### 📅 Relatório Semanal: Supervisores com Mais Faltas\nRanking dos supervisores com maior índice de faltas em suas rotas nos últimos 7 dias (Dados semanais fechados):\n\n`;
        sortedSup.slice(0, 5).forEach((supId, idx) => {
            const sup = supervisors.find(s => s.id === supId);
            const linkSup = sup ? `<a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="${sup.id}">${sup.nome}</a>` : 'Desconhecido';
            report += `${idx + 1}. **Supervisor ${linkSup}**: ${counts[supId]} faltas registradas na carteira.\n`;
        });

        return report;
    }

    // Faz a chamada assíncrona para o proxy da Vercel (que fala com o Gemini)
    static async _callGeminiAPI(queryText, posts, incidents, supervisors) {
        const cleanPosts = posts.map(p => {
            const dSup = supervisors.find(s => s.id === p.daySupervisorId);
            const nSup = supervisors.find(s => s.id === p.nightSupervisorId);
            return {
                id: p.id,
                nome: p.nome,
                bairro: p.bairro,
                turno: p.isDayOnly ? 'Diurno' : p.isNightOnly ? 'Noturno' : '24 Horas',
                supervisor_diurno: dSup ? dSup.nome : 'Não vinculado',
                supervisor_noturno: nSup ? nSup.nome : 'Não vinculado'
            };
        });

        const cleanIncidents = incidents.filter(i => i.status === 'pendente').map(i => {
            const post = posts.find(p => p.id === i.postId);
            const sup = supervisors.find(s => s.id === i.supervisorId);
            return {
                id: i.id,
                postoId: i.postId,
                postoNome: post ? post.nome : 'N/A',
                bairro: post ? post.bairro : 'N/A',
                tipo: i.type, // falta, demissao, os, observacao
                colaborador: i.colaborador || 'Não informado',
                detalhes: i.detalhes,
                supervisor: sup ? sup.nome : 'N/A',
                supervisorId: i.supervisorId,
                data: i.data,
                severidade: i.severidade
            };
        });

        const cleanSupervisors = supervisors.map(s => ({
            id: s.id,
            nome: s.nome,
            turno: s.turno
        }));

        const databaseContext = {
            data_atual: new Date().toISOString().split('T')[0],
            total_postos_ativos: cleanPosts.length,
            total_supervisores: cleanSupervisors.length,
            postos: cleanPosts,
            ocorrencias_ativas: cleanIncidents,
            supervisores: cleanSupervisors
        };

        const systemInstruction = `Você é o Analista Operacional e de RH Estratégico da Embraps, atuando em Santos-SP.
Sua missão é dar suporte analisando postos de serviço, histórico de faltas, avisos de demissão, admissões e OS.
Você tem acesso à base de dados em tempo real em formato JSON contendo o histórico de ocorrências.

REGRAS DE RESPOSTA (MUITO IMPORTANTES):
1. Sempre que citar um posto no texto, você DEVE obrigatoriamente criar um link no formato HTML:
   <a href="#" class="ai-action-link" data-action="focus-post" data-id="ID_DO_POSTO">NOME_DO_POSTO</a>
2. Sempre que citar um supervisor, crie um link no formato HTML:
   <a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="ID_DO_SUPERVISOR">NOME_DO_SUPERVISOR</a>
3. Mapeie padrões na área geográfica baseando-se no JSON de ocorrências. Se o usuário pedir um Plano de Ação Estratégico, analise as tendências (turnover via demissões x admissões) e absenteísmo por bairro, fornecendo recomendações de longo prazo para os supervisores.
4. Responda em português de forma clara, com tabelas markdown e tópicos.
5. Se for um problema do dia a dia (contingência), ofereça soluções locais com postos próximos. Se for estratégico, olhe para os totais.`;

        const userPrompt = `DADOS DA OPERAÇÃO DE SANTOS:
${JSON.stringify(databaseContext, null, 2)}

PERGUNTA OPERACIONAL:
"${queryText}"`;

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userPrompt }]
                    }
                ],
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                generationConfig: {
                    temperature: 0.15,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!reply) {
            throw new Error("Gemini retornou conteúdo vazio.");
        }

        return reply;
    }

    // GERAÇÃO DE RELATÓRIO DIÁRIO (RESUMO EXECUTIVO)
    static generateDailyReport(posts, incidents, supervisors) {
        const activeIncidents = incidents.filter(i => i.status === 'pendente');
        const faltas = activeIncidents.filter(i => i.type === 'falta');
        const demissoes = activeIncidents.filter(i => i.type === 'demissao');
        const os = activeIncidents.filter(i => i.type === 'os');
        const obs = activeIncidents.filter(i => i.type === 'observacao');

        const totalPosts = posts.length;
        const totalAlertas = activeIncidents.length;

        // Distribuição de alertas por bairro
        const bairrosAlerta = {};
        activeIncidents.forEach(i => {
            const p = posts.find(post => post.id === i.postId);
            if (p) {
                bairrosAlerta[p.bairro] = (bairrosAlerta[p.bairro] || 0) + 1;
            }
        });

        const topBairros = Object.entries(bairrosAlerta)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 3)
            .map(e => `**${e[0]}** (${e[1]} ocorrências)`)
            .join(', ');

        let alertIndicator = "🟢 **Operação Estável**";
        if (faltas.length > 5) alertIndicator = "🔴 **Operação Crítica (Alto índice de faltas)**";
        else if (totalAlertas > 0) alertIndicator = "🟡 **Operação com Atenção Requerida**";

        return `### 📊 Resumo Executivo da Operação - Santos/SP
**Status Geral:** ${alertIndicator}

* **Total de Postos Ativos:** ${totalPosts} postos monitorados.
* **Supervisores Diurnos:** 13 rotas ativas.
* **Supervisores Noturnos:** 4 rotas ativas.
* **Ocorrências Pendentes:** ${totalAlertas} alertas não resolvidos.

---

#### 🚨 Detalhamento dos Alertas Ativos:
* **Faltas de Efetivo:** 🔴 **${faltas.length}** pendentes (requer ação rápida de remanejamento).
* **Processos de Demissão:** 💼 **${demissoes.length}** pendentes (requer reposição de vagas).
* **Ordens de Serviço (OS):** 🛠️ **${os.length}** solicitações de clientes em andamento.
* **Outras Observações:** ℹ️ **${obs.length}** notas operacionais de rondas.

${topBairros ? `📍 **Zonas mais afetadas no momento:** ${topBairros}` : '📍 Nenhuma área crítica de alertas identificada hoje.'}

---

#### 💡 Próximas Ações Recomendadas:
${faltas.length > 0 ? `* Há **${faltas.length} postos desguarnecidos** por falta. Pergunte-me *"Plano de contingência para as faltas"* para ver candidatos a remanejamento.` : '* Todos os postos estão guarnecidos neste turno.'}
${os.length > 0 ? `* Existem **${os.length} ordens de serviço** pendentes de execução. Certifique-se de instruir os supervisores de rota correspondentes.` : '* Nenhuma ordem de serviço pendente.'}
`;
    }

    // GERAÇÃO DE ANÁLISE DE FALTAS
    static generateAbsenceReport(posts, incidents, supervisors) {
        const activeAbsences = incidents.filter(i => i.status === 'pendente' && i.type === 'falta');

        if (activeAbsences.length === 0) {
            return `### 🟢 Relatório de Faltas - Santos/SP
Nenhuma falta de efetivo ativa registrada no momento. Toda a escala de 360 postos está completa para este turno.`;
        }

        let report = `### 🔴 Relatório de Faltas Ativas (${activeAbsences.length})
Identificamos os seguintes postos com falta de efetivo no turno de hoje:

| Posto | Bairro | Supervisor Diurno | Supervisor Noturno | Detalhes da Falta |
| :--- | :--- | :--- | :--- | :--- |
`;

        activeAbsences.forEach(abs => {
            const post = posts.find(p => p.id === abs.postId);
            if (!post) return;

            const supDay = supervisors.find(s => s.id === post.daySupervisorId);
            const supNight = supervisors.find(s => s.id === post.nightSupervisorId);

            const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${post.id}">${post.nome}</a>`;
            const linkSupD = supDay ? `<a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="${supDay.id}">${supDay.nome}</a>` : 'Não definido';
            const linkSupN = supNight ? `<a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="${supNight.id}">${supNight.nome}</a>` : 'Não definido';

            report += `| ${linkPost} | ${post.bairro} | ${linkSupD} | ${linkSupN} | *${abs.colaborador || 'Vigilante'}*: ${abs.detalhes} |\n`;
        });

        report += `
---
💡 **Precisa resolver?** 
Digite *"Plano de contingência"* para que eu calcule opções de remanejamento com base na distância geográfica e rotas dos supervisores mais próximos.`;

        return report;
    }

    // PLANO DE CONTINGÊNCIA GEOGRÁFICO DE FALTAS (Muito Avançado!)
    static generateContingencyPlan(posts, incidents, supervisors) {
        const activeAbsences = incidents.filter(i => i.status === 'pendente' && i.type === 'falta');

        if (activeAbsences.length === 0) {
            return `### 🟢 Plano de Contingência
Não há faltas ativas registradas. Nenhum plano de contingência de remanejamento é necessário hoje.`;
        }

        let report = `### 🚨 Plano de Contingência IA: Cobertura de Faltas
Calculei as melhores opções geográficas para cobertura dos postos com faltas de efetivo ativos em Santos:

`;

        activeAbsences.forEach((abs, index) => {
            const targetPost = posts.find(p => p.id === abs.postId);
            if (!targetPost) return;

            const linkTargetPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${targetPost.id}">${targetPost.nome}</a>`;
            report += `#### ${index + 1}. Falta no posto: ${linkTargetPost} (${targetPost.bairro})
* **Colaborador Faltante:** ${abs.colaborador || 'Não Informado'}
* **Detalhes:** *${abs.detalhes}*
* **Supervisor Responsável:** ${targetPost.daySupervisorId ? supervisors.find(s => s.id === targetPost.daySupervisorId).nome + ' (Diurno)' : ''} ${targetPost.nightSupervisorId ? ' / ' + supervisors.find(s => s.id === targetPost.nightSupervisorId).nome + ' (Noturno)' : ''}

**Opções de Remanejamento Geográfico sugeridas:**
`;

            // Encontrar os postos ativos mais próximos (excluindo os que também têm faltas)
            const postDistances = posts
                .filter(p => p.id !== targetPost.id && p.ativo !== false && !activeAbsences.some(a => a.postId === p.id))
                .map(p => {
                    const dist = this._getDistanceKM(targetPost.lat, targetPost.lng, p.lat, p.lng);
                    return { post: p, dist: dist };
                })
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3); // top 3 mais próximos

            postDistances.forEach((item, pIdx) => {
                const p = item.post;
                const distStr = item.dist.toFixed(2);
                const linkClosePost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>`;
                
                // Buscar supervisor do posto próximo
                const daySup = supervisors.find(s => s.id === p.daySupervisorId);
                const nightSup = supervisors.find(s => s.id === p.nightSupervisorId);
                
                report += `  * **Opção ${pIdx + 1}**: Posto ${linkClosePost} em **${p.bairro}** a **${distStr} km** de distância. (Supervisores: Diurno: ${daySup?.nome || 'N/A'}, Noturno: ${nightSup?.nome || 'N/A'}).\n`;
            });

            // Buscar supervisor de plantão livre (ou mais próximo)
            const activeSupId = abs.supervisorId || targetPost.daySupervisorId || targetPost.nightSupervisorId;
            const currentSup = supervisors.find(s => s.id === activeSupId);
            
            report += `  * **Ação do Supervisor**: Acionar o supervisor responsável **${currentSup ? currentSup.nome : 'N/A'}** para se deslocar ao posto para cobertura provisória de guarita.`;
            report += `\n\n`;
        });

        return report;
    }

    // RELATÓRIO DE DEMISSÕES
    static generateDismissalReport(posts, incidents, supervisors) {
        const activeDismissals = incidents.filter(i => i.status === 'pendente' && i.type === 'demissao');

        if (activeDismissals.length === 0) {
            return `### 🟢 Alertas de Demissão/Reposição - Santos/SP
Nenhum aviso prévio ou pedido de demissão pendente de reposição na base.`;
        }

        let report = `### 💼 Alertas de Demissão e Vagas Abertas (${activeDismissals.length})
Os seguintes postos possuem colaboradores em processo de desligamento ou vagas pendentes:

`;

        activeDismissals.forEach(dis => {
            const post = posts.find(p => p.id === dis.postId);
            if (!post) return;

            const supervisor = supervisors.find(s => s.id === dis.supervisorId);
            const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${post.id}">${post.nome}</a>`;
            const linkSup = supervisor ? `<a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="${supervisor.id}">${supervisor.nome}</a>` : 'Não definido';

            report += `* **Posto:** ${linkPost} (${post.bairro})
  * **Colaborador:** ${dis.colaborador || 'Não informado'}
  * **Supervisor da Carteira:** ${linkSup}
  * **Data do Registro:** ${dis.data}
  * **Detalhes do Processo:** *${dis.detalhes}*
  * **Recomendação:** Acionar Recursos Humanos para agendamento de processo seletivo de vigilante reserva para cobertura de vaga definitiva.
\n`;
        });

        return report;
    }

    // RELATÓRIO DE ORDENS DE SERVIÇO (OS)
    static generateOSReport(posts, incidents, supervisors) {
        const activeOS = incidents.filter(i => i.status === 'pendente' && i.type === 'os');

        if (activeOS.length === 0) {
            return `### 🟢 Ordens de Serviço (OS) - Santos/SP
Nenhuma solicitação de cliente pendente. Todas as ordens de serviço ativas foram concluídas e arquivadas.`;
        }

        let report = `### 🛠️ Ordens de Serviço (OS) em Execução (${activeOS.length})
Lista de demandas extras e serviços especiais solicitados pelos clientes hoje:

`;

        activeOS.forEach(os => {
            const post = posts.find(p => p.id === os.postId);
            if (!post) return;

            const supervisor = supervisors.find(s => s.id === os.supervisorId);
            const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${post.id}">${post.nome}</a>`;
            const linkSup = supervisor ? `<a href="#" class="ai-action-link" data-action="focus-supervisor" data-id="${supervisor.id}">${supervisor.nome}</a>` : 'Não definido';

            report += `* **Posto:** ${linkPost} (${post.bairro})
  * **Supervisor de Escolta/Ronda:** ${linkSup}
  * **Solicitação:** *${os.detalhes}*
  * **Prioridade:** ${os.severidade === 'alta' ? '🔴 ALTA' : os.severidade === 'media' ? '🟡 MÉDIA' : '🟢 BAIXA'}
  * **Ação:** O supervisor de rota deve comparecer ao local no horário especificado e registrar o relatório de atendimento de OS.
\n`;
        });

        return report;
    }

    // RELATÓRIO DE BAIRRO ESPECÍFICO
    static generateBairroReport(bairro, posts, incidents, supervisors) {
        const bairroPosts = posts.filter(p => p.bairro === bairro);
        const activeIncidents = incidents.filter(i => i.status === 'pendente');
        
        // Ocorrências no bairro
        const bairroIncidents = activeIncidents.filter(i => {
            const p = posts.find(post => post.id === i.postId);
            return p && p.bairro === bairro;
        });

        const totalPosts = bairroPosts.length;
        const totalAlerts = bairroIncidents.length;

        let report = `### 📍 Análise de Bairro: ${bairro}
Temos **${totalPosts} postos de serviço** nesta região de Santos/SP.
**Ocorrências ativas no bairro:** ${totalAlerts > 0 ? `🔴 **${totalAlerts}**` : '🟢 **Nenhuma ocorrência**'}.

`;

        if (totalAlerts > 0) {
            report += `#### 🚨 Alertas Ativos no Bairro:\n`;
            bairroIncidents.forEach(inc => {
                const p = posts.find(post => post.id === inc.postId);
                const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>`;
                const tipoIcon = inc.type === 'falta' ? '🔴 Falta' : inc.type === 'demissao' ? '💼 Demissão' : inc.type === 'os' ? '🛠️ OS' : 'ℹ️ Obs';
                
                report += `* [${tipoIcon}] No posto ${linkPost}: *${inc.detalhes}*\n`;
            });
        }

        report += `\n#### 🏢 Postos na Região (Top 8):\n`;
        bairroPosts.slice(0, 8).forEach(p => {
            const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>`;
            const dSup = supervisors.find(s => s.id === p.daySupervisorId);
            const nSup = supervisors.find(s => s.id === p.nightSupervisorId);

            report += `* ${linkPost} (Diurno: ${dSup?.nome || 'N/A'}, Noturno: ${nSup?.nome || 'N/A'})\n`;
        });

        if (totalPosts > 8) {
            report += `* ... e outros ${totalPosts - 8} postos cadastrados.`;
        }

        return report;
    }

    // RELATÓRIO DE SUPERVISOR ESPECÍFICO
    static generateSupervisorReport(supervisor, posts, incidents, supervisors) {
        // Encontrar postos onde ele é supervisor diurno OU noturno
        const isDiurno = supervisor.turno === 'diurno';
        const supPosts = posts.filter(p => 
            (isDiurno && p.daySupervisorId === supervisor.id) || 
            (!isDiurno && p.nightSupervisorId === supervisor.id)
        );

        const activeIncidents = incidents.filter(i => i.status === 'pendente');
        
        // Incidentes sob responsabilidade dele
        const supIncidents = activeIncidents.filter(i => {
            const p = posts.find(post => post.id === i.postId);
            if (!p) return false;
            return (isDiurno && p.daySupervisorId === supervisor.id) || 
                   (!isDiurno && p.nightSupervisorId === supervisor.id);
        });

        const totalPosts = supPosts.length;
        const totalAlertas = supIncidents.length;

        let report = `### 👤 Carteira do Supervisor: ${supervisor.nome} (${supervisor.turno.toUpperCase()})
* **Total de Postos na Carteira:** ${totalPosts} postos de serviço.
* **Cor de Identificação no Mapa:** <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${supervisor.cor}; border: 1px solid #fff;"></span> **${supervisor.cor}**
* **Status da Carteira:** ${totalAlertas > 0 ? `🔴 **${totalAlertas} ocorrência(s) pendente(s)**` : '🟢 **Sem pendências**'}

---

`;

        if (totalAlertas > 0) {
            report += `#### 🚨 Alertas na área do supervisor:\n`;
            supIncidents.forEach(inc => {
                const p = posts.find(post => post.id === inc.postId);
                const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>`;
                const tipoIcon = inc.type === 'falta' ? '🔴 Falta' : inc.type === 'demissao' ? '💼 Demissão' : inc.type === 'os' ? '🛠️ OS' : 'ℹ️ Obs';
                
                report += `* [${tipoIcon}] No posto ${linkPost}: *${inc.detalhes}*\n`;
            });
            report += `\n`;
        }

        report += `#### 📋 Lista de Postos sob Supervisão (Top 10):\n`;
        supPosts.slice(0, 10).forEach(p => {
            const linkPost = `<a href="#" class="ai-action-link" data-action="focus-post" data-id="${p.id}">${p.nome}</a>`;
            const backupSup = isDiurno 
                ? supervisors.find(s => s.id === p.nightSupervisorId)
                : supervisors.find(s => s.id === p.daySupervisorId);
            
            report += `* ${linkPost} em **${p.bairro}** (Supervisor de Apoio: ${backupSup?.nome || 'N/A'})\n`;
        });

        if (totalPosts > 10) {
            report += `* ... e outros ${totalPosts - 10} postos de serviço na carteira.`;
        }

        return report;
    }
}

window.AIOperationalAnalyst = AIOperationalAnalyst;
