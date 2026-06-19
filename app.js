// Lógica Principal da Aplicação (app.js)
// Orquestra mapa, formulários, ações de IA e banco de dados.

document.addEventListener('DOMContentLoaded', async () => {
    // Inicialização básica
    await DatabaseService.init();
    lucide.createIcons();

    // Estado da Aplicação
    let map = null;
    let markersGroup = null; // Grupo Clusterizado do Leaflet
    let heatLayer = null; // Camada Heatmap
    let sonarGroup = null; // Zonas de Radar Sonar
    let supervisorPolygons = []; // Polígonos de supervisores desenhados
    let activeTempMarker = null; // Marcador temporário de clique para novos postos
    let chartInstance = null; // Gráfico Chart.js
    
    // Dados carregados na sessão
    let posts = [];
    let ocorrencias = [];
    let supervisores = [];
    let pendingImportList = []; // Lista temporária de alertas lidos na planilha

    // Elementos da UI
    const lblTotalPostos = document.getElementById('lbl-total-postos');
    const lblTotalFaltas = document.getElementById('lbl-total-faltas');
    const lblTotalOS = document.getElementById('lbl-total-os');
    const lblTotalDemissoes = document.getElementById('lbl-total-demissoes');
    const lblTotalAdmissoes = document.getElementById('lbl-total-admissoes');

    const selectSupervisor = document.getElementById('filter-supervisor');
    const selectBairro = document.getElementById('filter-bairro');
    const selectPeriodo = document.getElementById('filter-periodo');
    const selectStatus = document.getElementById('filter-status');
    const txtSearchPosto = document.getElementById('search-posto');
    const chkShowHeatmap = document.getElementById('chk-show-heatmap');
    const selectMes = document.getElementById('filter-mes');
    let showPolygons = false;

    const tblOcorrenciasBody = document.getElementById('tbl-ocorrencias-body');
    const selectIncPosto = document.getElementById('inc-posto-id');

    // Helper: Pega os Top 10 postos com mais faltas e demissões nos últimos 7 dias
    function getTop10WeeklyPosts(allIncidents) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const weeklyIncidents = allIncidents.filter(i => {
            const d = new Date(i.data);
            const tipo = i.tipo || i.type;
            return d >= lastWeek && (tipo === 'falta' || tipo === 'demissao');
        });
        
        const counts = {};
        weeklyIncidents.forEach(i => {
            counts[i.postId] = (counts[i.postId] || 0) + 1;
        });
        
        return Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 10);
    }

    // Inicialização do Mapa Leaflet
    function initMap() {
        // Centrado em Santos - SP (Orla/Gonzaga)
        map = L.map('map', {
            zoomControl: true,
            maxZoom: 18,
            minZoom: 11
        }).setView([-23.9608, -46.3339], 13);

        // Camada de Mapa Escura (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        markersGroup = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 40
        });
        map.addLayer(markersGroup);

        sonarGroup = L.layerGroup();
        map.addLayer(sonarGroup);

        // Evento de clique no mapa (para capturar coordenadas de novo posto)
        map.on('click', (e) => {
            const modalPost = document.getElementById('modal-post');
            if (modalPost.classList.contains('active')) {
                const lat = e.latlng.lat.toFixed(6);
                const lng = e.latlng.lng.toFixed(6);
                
                document.getElementById('form-post-lat').value = lat;
                document.getElementById('form-post-lng').value = lng;
                
                // Reposicionar marcador temporário
                if (activeTempMarker) {
                    activeTempMarker.setLatLng(e.latlng);
                } else {
                    activeTempMarker = L.marker(e.latlng, {
                        icon: L.divIcon({
                            className: 'custom-marker-temp',
                            html: '<div style="background-color:#3b82f6; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px #3b82f6;"></div>',
                            iconSize: [16, 16]
                        })
                    }).addTo(map);
                }
            }
        });
    }

    // Algoritmo Convex Hull para calcular área de supervisores
    function crossProduct(o, a, b) {
        return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
    }

    function getConvexHull(points) {
        if (points.length < 3) return points;
        
        // Copiar e ordenar por longitude e latitude
        const pts = points.slice().sort((a, b) => a.lng !== b.lng ? a.lng - b.lng : a.lat - b.lat);
        
        const lower = [];
        for (let i = 0; i < pts.length; i++) {
            while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
                lower.pop();
            }
            lower.push(pts[i]);
        }
        
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) {
                upper.pop();
            }
            upper.push(pts[i]);
        }
        
        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    // Carregar dados e recarregar UI
    async function loadData() {
        try {
            // Requisições paralelas para reduzir tempo de espera de timeout (max 5s)
            const [contelePosts, conteleSup, conteleTasks] = await Promise.all([
                ConteleService.getPosts(),
                ConteleService.getSupervisores(),
                ConteleService.getTasks()
            ]);

            if (contelePosts && contelePosts.length > 0) {
                posts = contelePosts;
            } else {
                posts = await DatabaseService.getPosts();
            }

            if (conteleSup && conteleSup.length > 0) {
                supervisores = conteleSup;
            } else {
                supervisores = await DatabaseService.getSupervisores();
            }
            
            window.conteleTasks = conteleTasks || [];
        } catch (e) {
            console.error("Erro ao sincronizar com Contele:", e);
            posts = await DatabaseService.getPosts();
            supervisores = await DatabaseService.getSupervisores();
            window.conteleTasks = [];
        }

        ocorrencias = await DatabaseService.getIncidents();

        // Atualizar painéis
        updateStats();
        populateFilters();
        renderOcorrenciasTable();
        renderMarkers();
        updateChart();
        populateOcorrenciaFormPostSelect();
    }

    // Helper para obter ocorrências baseadas no filtro de mês
    function getFilteredIncidents() {
        const mes = selectMes.value;
        if (mes === 'historico') {
            return ocorrencias; // Mostra o histórico todo (inclusive resolvidos)
        }
        return ocorrencias.filter(o => o.status === 'pendente');
    }

    // Atualiza contadores do Header
    function updateStats() {
        const activeIncidents = getFilteredIncidents();
        
        lblTotalPostos.textContent = posts.length;
        lblTotalFaltas.textContent = activeIncidents.filter(o => (o.tipo || o.type) === 'falta').length;
        if (lblTotalOS) lblTotalOS.textContent = activeIncidents.filter(o => (o.tipo || o.type) === 'os').length;
        lblTotalDemissoes.textContent = activeIncidents.filter(o => (o.tipo || o.type) === 'demissao').length;
        if (lblTotalAdmissoes) lblTotalAdmissoes.textContent = activeIncidents.filter(o => (o.tipo || o.type) === 'admissao').length;
    }

    // Popula dropdowns de filtros
    function populateFilters() {
        // Guardar valor atual para não resetar se o usuário estiver navegando
        const currentSup = selectSupervisor.value;
        const currentBairro = selectBairro.value;

        // Limpar opções exceto 'todos'
        selectSupervisor.innerHTML = '<option value="todos">Todos os Supervisores</option>';
        selectBairro.innerHTML = '<option value="todos">Todos os Bairros</option>';

        // Supervisores ordenados por turno e nome
        supervisores.forEach(sup => {
            const opt = document.createElement('option');
            opt.value = sup.id;
            opt.textContent = `${sup.nome} (${sup.turno.toUpperCase()})`;
            selectSupervisor.appendChild(opt);
        });

        // Bairros únicos ordenados
        const bairros = [...new Set(posts.map(p => p.bairro))].sort();
        bairros.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            selectBairro.appendChild(opt);
        });

        // Restaurar seleções
        if (currentSup) selectSupervisor.value = currentSup;
        if (currentBairro) selectBairro.value = currentBairro;
    }

    // Popula select de postos do form de cadastrar ocorrência
    function populateOcorrenciaFormPostSelect() {
        const currentPostSelected = selectIncPosto.value;
        selectIncPosto.innerHTML = '<option value="">Selecione o Posto...</option>';
        
        // Ordena postos por nome
        const sortedPosts = posts.slice().sort((a,b) => a.nome.localeCompare(b.nome));
        sortedPosts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nome} (${p.bairro})`;
            selectIncPosto.appendChild(opt);
        });

        if (currentPostSelected) selectIncPosto.value = currentPostSelected;
    }

    // Desenhar áreas dos supervisores no mapa
    function drawSupervisorPolygons(filteredPosts) {
        // Limpar áreas antigas
        supervisorPolygons.forEach(p => map.removeLayer(p));
        supervisorPolygons = [];

        if (!showPolygons) return;

        const activeSupervisorFilter = selectSupervisor.value;
        if (activeSupervisorFilter === 'todos') return; // Mantém limpo se "Todos" selecionado

        const sup = supervisores.find(s => s.id === activeSupervisorFilter);
        if (!sup) return;

        const isDiurno = sup.turno === 'diurno';
        const supPosts = filteredPosts.filter(p => 
            (isDiurno && p.daySupervisorId === sup.id) || 
            (!isDiurno && p.nightSupervisorId === sup.id)
        );

        if (supPosts.length >= 3) {
            // Obter coordenadas
            const coords = supPosts.map(p => ({ lat: p.lat, lng: p.lng }));
            const hull = getConvexHull(coords);
            const latLngs = hull.map(c => [c.lat, c.lng]);

            // Health logic: check if the area has a high number of incidents
            const incidentsInArea = getFilteredIncidents().filter(inc => supPosts.some(p => p.id === inc.postId));
            const areaHealthColor = incidentsInArea.length > 5 ? varColor('danger') : incidentsInArea.length > 2 ? varColor('warning') : varColor('success');

            // Desenhar polígono usando cor do supervisor para linha e saude operacional para preenchimento
            const poly = L.polygon(latLngs, {
                color: sup.cor,
                fillColor: areaHealthColor,
                fillOpacity: 0.25,
                weight: 3,
                dashArray: isDiurno ? '' : '5, 8'
            });
            
            poly.bindTooltip(`Área: ${sup.nome} (${sup.turno.toUpperCase()})<br>Saúde Operacional: ${incidentsInArea.length} ocorrência(s)`, { permanent: true, direction: 'center', className: 'polygon-tooltip' });
            poly.addTo(map);
            supervisorPolygons.push(poly);
        } else if (supPosts.length > 0) {
            const incidentsInArea = getFilteredIncidents().filter(inc => supPosts.some(p => p.id === inc.postId));
            const areaHealthColor = incidentsInArea.length > 0 ? varColor('danger') : varColor('success');
            
            // Desenhar círculos para supervisores com poucos postos
            supPosts.forEach(p => {
                const circle = L.circle([p.lat, p.lng], {
                    radius: 400,
                    color: sup.cor,
                    fillColor: areaHealthColor,
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: isDiurno ? '' : '3, 6'
                });
                circle.bindTooltip(`${sup.nome} (Posto isolado)`, { sticky: true });
                circle.addTo(map);
                supervisorPolygons.push(circle);
            });
        }
    }

    // Renderizar Marcadores no Mapa
    function renderMarkers() {
        markersGroup.clearLayers();

        // Filtragem
        const query = txtSearchPosto.value.toLowerCase();
        const supId = selectSupervisor.value;
        const bairro = selectBairro.value;
        const periodo = selectPeriodo.value;
        const status = selectStatus.value;

        const activeIncidents = getFilteredIncidents();

        const filteredPosts = posts.filter(p => {
            // Filtro busca texto
            if (query && !p.nome.toLowerCase().includes(query) && !p.bairro.toLowerCase().includes(query)) return false;
            
            // Filtro bairro
            if (bairro !== 'todos' && p.bairro !== bairro) return false;
            
            // Filtro supervisor (diurno ou noturno)
            if (supId !== 'todos') {
                if (p.daySupervisorId !== supId && p.nightSupervisorId !== supId) return false;
            }

            // Filtro periodo (diurno/noturno/24h)
            if (periodo !== 'todos') {
                if (periodo === 'diurno' && !p.isDayOnly && p.isNightOnly) return false;
                if (periodo === 'noturno' && !p.isNightOnly && p.isDayOnly) return false;
                if (periodo === '24h' && (p.isDayOnly || p.isNightOnly)) return false;
            }

            // Filtro de status de alerta
            if (status !== 'todos') {
                const postIncidents = activeIncidents.filter(o => o.postId === p.id);
                if (status === 'normal' && postIncidents.length > 0) return false;
                if (status === 'falta' && !postIncidents.some(o => (o.tipo || o.type) === 'falta')) return false;
                if (status === 'os' && !postIncidents.some(o => (o.tipo || o.type) === 'os')) return false;
                if (status === 'demissao' && !postIncidents.some(o => (o.tipo || o.type) === 'demissao')) return false;
                if (status === 'alagamento' && !postIncidents.some(o => (o.tipo || o.type) === 'alagamento')) return false;
            }

            return true;
        });

        const top10Posts = getTop10WeeklyPosts(ocorrencias);

        // Adicionar marcadores
        filteredPosts.forEach(post => {
            // Verificar se o posto possui ocorrências ativas
            const postIncidents = activeIncidents.filter(o => o.postId === post.id);
            const isTop10 = top10Posts.includes(post.id);
            const isAlagamento = postIncidents.some(o => (o.tipo || o.type) === 'alagamento');
            
            // Determinar cor do marcador baseado no alerta
            let markerColor = varColor('primary'); // azul padrão (Normal)
            let customClass = '';
            let priorityText = "Operacional";

            if (isAlagamento && post.hasComporta) {
                markerColor = varColor('info'); // roxo
                customClass = 'marker-pulse-alagamento';
                priorityText = "COMPORTA ATIVADA (RISCO ALTO)";
            } else if (isTop10) {
                markerColor = varColor('danger'); // vermelho para Top 10 semanal
                customClass = 'marker-pulse-danger';
                priorityText = "Top 10 Ocorrências da Semana";
            } else if (post.hasComporta) {
                markerColor = varColor('secondary'); // ciano para comporta normal
                priorityText = "Sistema de Comporta (Inativo)";
            } else if (postIncidents.length > 0) {
                // Outros postos com ocorrencia que nao sao top 10 ou alagamento ficam laranja p/ destaque leve (opcional)
                markerColor = varColor('warning');
                priorityText = "Com Ocorrência";
            }

            // Encontrar nomes dos supervisores
            const supDay = supervisores.find(s => s.id === post.daySupervisorId);
            const supNight = supervisores.find(s => s.id === post.nightSupervisorId);

            // Criar HTML customizado para o marcador (Cara de Empresa/Prédio)
            const markerHtml = `
                <div style="
                    background-color: ${markerColor};
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    border: 2px solid #fff;
                    box-shadow: 0 0 8px ${markerColor};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                " class="${customClass}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
                </div>
            `;

            const icon = L.divIcon({
                className: 'custom-marker-icon',
                html: markerHtml,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([post.lat, post.lng], { icon: icon });

            // Popup HTML
            const popupHtml = `
                <div style="min-width: 220px;">
                    <h3>${post.nome}</h3>
                    <p><strong>Bairro:</strong> ${post.bairro}</p>
                    <p><strong>Turno:</strong> ${post.isDayOnly ? 'Apenas Diurno' : post.isNightOnly ? 'Apenas Noturno' : '24 Horas'}</p>
                    ${post.hasComporta ? `<p><strong style="color:var(--color-info);">✓ Possui Comporta</strong></p>` : ''}
                    <p><strong>Sup. Diurno:</strong> ${supDay ? supDay.nome : 'N/A'}</p>
                    <p><strong>Sup. Noturno:</strong> ${supNight ? supNight.nome : 'N/A'}</p>
                    <p><strong>Status:</strong> <span style="color:${markerColor}; font-weight:bold;">${priorityText}</span></p>
                    
                    ${postIncidents.length > 0 ? `
                        <div style="border-top:1px solid var(--border-subtle); margin-top:8px; padding-top:6px; font-size:0.75rem;">
                            <strong>Ocorrências Ativas:</strong>
                            <ul style="padding-left:14px; margin-top:4px;">
                                ${postIncidents.map(inc => `<li>[${inc.tipo.toUpperCase()}] ${inc.detalhes}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${((window.conteleTasks || []).filter(t => String(t.poiId) === String(post.id)).length > 0) ? `
                        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 6px; margin-top: 8px;">
                            <strong style="color: var(--color-success); font-size: 0.75rem;">📋 ${((window.conteleTasks || []).filter(t => String(t.poiId) === String(post.id)).length)} Visita(s) Hoje (Contele)</strong>
                            <a href="https://app.contelege.com.br" target="_blank" style="display:block; margin-top:4px; font-size:0.75rem; color:var(--color-primary); text-decoration:none;">🔗 Ver Relatório de OS/Visita</a>
                        </div>
                    ` : ''}

                    <div style="margin-top:12px; display:flex; justify-content:space-between;">
                        <button class="leaflet-popup-btn" onclick="window.deletePostPrompt('${post.id}')">Excluir</button>
                        <button class="leaflet-popup-btn btn-sec" onclick="window.editPostPrompt('${post.id}')">Editar</button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupHtml);
            markersGroup.addLayer(marker);
            
            // Guardar referência no elemento para controle de foco
            post.marker = marker;
        });

        // Desenhar os polígonos de supervisão
        drawSupervisorPolygons(filteredPosts);

        // Renderizar Mapa de Calor (Heatmap) se ativado
        if (heatLayer) {
            map.removeLayer(heatLayer);
            heatLayer = null;
        }

        if (chkShowHeatmap && chkShowHeatmap.checked && typeof L.heatLayer !== 'undefined') {
            const heatPoints = [];
            // Filtro heatmap apenas para posts no Top 10 e que tem faltas
            ocorrencias.forEach(inc => {
                if (top10Posts.includes(inc.postId) && ((inc.tipo || inc.type) === 'falta')) {
                    const post = posts.find(p => p.id === inc.postId);
                    if (post) {
                        heatPoints.push([post.lat, post.lng, 1.0]);
                    }
                }
            });

            if (heatPoints.length > 0) {
                heatLayer = L.heatLayer(heatPoints, {
                    radius: 40,
                    blur: 30,
                    maxZoom: 15,
                    gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
                }).addTo(map);
            }
        }
    }

    // Helper para obter variáveis CSS de cores
    function varColor(name) {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue(`--color-${name}`).trim() || '#fff';
    }

    // Renderizar tabela de ocorrências no rodapé
    function renderOcorrenciasTable() {
        tblOcorrenciasBody.innerHTML = '';
        
        // Ocorrências pendentes primeiro
        const sortedIncidents = ocorrencias.slice().sort((a,b) => {
            if (a.status === b.status) {
                return new Date(b.data) - new Date(a.data);
            }
            return a.status === 'pendente' ? -1 : 1;
        });

        if (sortedIncidents.length === 0) {
            tblOcorrenciasBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Nenhuma ocorrência registrada hoje.</td></tr>';
            return;
        }

        sortedIncidents.forEach(inc => {
            const post = posts.find(p => p.id === inc.postId);
            const sup = supervisores.find(s => s.id === inc.supervisorId);
            
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            if (inc.status === 'resolvido') {
                tr.style.opacity = '0.5';
            }

            // Localizar no mapa ao clicar na linha (exceto se clicar no botão de resolver)
            tr.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && post) {
                    focusPostOnMap(post.id);
                }
            });

            const tipoFinal = inc.tipo || inc.type;
            const badgeClass = `badge badge-${tipoFinal}`;
            const labelTipo = tipoFinal === 'falta' ? 'Falta' : tipoFinal === 'demissao' ? 'Demissão' : tipoFinal === 'os' ? 'O.S' : tipoFinal === 'alagamento' ? 'Alagamento' : 'Observ.';

            tr.innerHTML = `
                <td><span class="${badgeClass}">${labelTipo}</span></td>
                <td><strong>${post ? post.nome : 'Posto Excluído'}</strong></td>
                <td>${post ? post.bairro : '-'}</td>
                <td>${sup ? sup.nome : 'Sem Supervisor'}</td>
                <td>${inc.colaborador || '-'}</td>
                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${inc.detalhes}">${inc.detalhes}</td>
                <td>${formatDate(inc.data)}</td>
                <td>
                    ${inc.status === 'pendente' ? 
                        `<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.7rem;" onclick="window.resolveIncidentEvent('${inc.id}')">Resolver</button>` : 
                        `<span style="color:var(--color-success); font-weight:600;"><i data-lucide="check" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> Resolvido</span>`
                    }
                </td>
            `;

            tblOcorrenciasBody.appendChild(tr);
        });

        lucide.createIcons({ attrs: { class: 'lucide' } });
    }

    // Foca mapa no posto específico
    function focusPostOnMap(postId) {
        const post = posts.find(p => p.id === postId);
        if (post && post.marker) {
            // Zoom e centrar no marcador
            map.setView([post.lat, post.lng], 16);
            post.marker.openPopup();
        }
    }

    // Formata datas para visualização amigável
    function formatDate(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    // Desenhar Gráfico Sidebar
    function updateChart() {
        const ctx = document.getElementById('mini-chart').getContext('2d');
        
        const activeIncidents = getFilteredIncidents();
        const countFaltas = activeIncidents.filter(o => o.type === 'falta').length;
        const countOS = activeIncidents.filter(o => o.type === 'os').length;
        const countDemissoes = activeIncidents.filter(o => o.type === 'demissao').length;
        const countAdmissoes = activeIncidents.filter(o => o.type === 'admissao').length;

        const data = [countFaltas, countOS, countDemissoes, countAdmissoes];

        if (chartInstance) {
            chartInstance.data.datasets[0].data = data;
            chartInstance.update();
        } else {
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.font.family = 'Inter';
            
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Falta', 'O.S.', 'Demiss.', 'Admis.'],
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            varColor('danger'),
                            varColor('warning'),
                            varColor('info'),
                            varColor('success')
                        ],
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { precision: 0 }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // --- EVENTOS E MODAIS ---

    // Modais
    const modalPost = document.getElementById('modal-post');
    const modalSettings = document.getElementById('modal-settings');
    const modalPreview = document.getElementById('modal-import-preview');

    // Fechar modais
    document.querySelectorAll('.modal-close, .modal-footer .btn-secondary, #btn-cancel-import-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modalPost.classList.remove('active');
            modalSettings.classList.remove('active');
            modalPreview.classList.remove('active');
            
            // Remover marcador temporário do mapa
            if (activeTempMarker) {
                map.removeLayer(activeTempMarker);
                activeTempMarker = null;
            }
        });
    });

    // Abrir modal novo posto
    document.getElementById('btn-open-add-post').addEventListener('click', () => {
        document.getElementById('modal-post-title').textContent = "Cadastrar Novo Posto";
        document.getElementById('form-post-id').value = "";
        document.getElementById('form-post-nome').value = "";
        document.getElementById('form-post-lat').value = "";
        document.getElementById('form-post-lng').value = "";
        
        // Popular select bairros no modal
        const selectModalBairro = document.getElementById('form-post-bairro');
        selectModalBairro.innerHTML = '';
        const bairros = [...new Set(BAIRROS_SANTOS.map(b => b.nome))].sort();
        bairros.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            selectModalBairro.appendChild(opt);
        });

        // Popular select supervisores diurnos
        const selectModalDaySup = document.getElementById('form-post-day-sup');
        selectModalDaySup.innerHTML = '<option value="">Sem supervisor diurno</option>';
        supervisores.filter(s => s.turno === 'diurno').forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nome;
            selectModalDaySup.appendChild(opt);
        });

        // Popular select supervisores noturnos
        const selectModalNightSup = document.getElementById('form-post-night-sup');
        selectModalNightSup.innerHTML = '<option value="">Sem supervisor noturno</option>';
        supervisores.filter(s => s.turno === 'noturno').forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nome;
            selectModalNightSup.appendChild(opt);
        });

        document.getElementById('form-post-dayonly').checked = false;
        document.getElementById('form-post-nightonly').checked = false;
        document.getElementById('form-post-hascomporta').checked = false;
        
        // Mostrar campos
        document.getElementById('form-group-day-sup').style.display = 'flex';
        document.getElementById('form-group-night-sup').style.display = 'flex';

        modalPost.classList.add('active');
    });

    // Toggle de exclusão de turnos no formulário
    document.getElementById('form-post-dayonly').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('form-post-nightonly').checked = false;
            document.getElementById('form-group-night-sup').style.display = 'none';
            document.getElementById('form-post-night-sup').value = "";
        } else {
            document.getElementById('form-group-night-sup').style.display = 'flex';
        }
    });

    document.getElementById('form-post-nightonly').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('form-post-dayonly').checked = false;
            document.getElementById('form-group-day-sup').style.display = 'none';
            document.getElementById('form-post-day-sup').value = "";
        } else {
            document.getElementById('form-group-day-sup').style.display = 'flex';
        }
    });

    // Salvar Posto (Cadastrar / Editar)
    document.getElementById('btn-save-post').addEventListener('click', async () => {
        const id = document.getElementById('form-post-id').value;
        const nome = document.getElementById('form-post-nome').value.trim();
        const bairro = document.getElementById('form-post-bairro').value;
        const lat = parseFloat(document.getElementById('form-post-lat').value);
        const lng = parseFloat(document.getElementById('form-post-lng').value);
        
        const isDayOnly = document.getElementById('form-post-dayonly').checked;
        const isNightOnly = document.getElementById('form-post-nightonly').checked;
        const hasComporta = document.getElementById('form-post-hascomporta').checked;
        const daySupervisorId = document.getElementById('form-post-day-sup').value || null;
        const nightSupervisorId = document.getElementById('form-post-night-sup').value || null;

        if (!nome || isNaN(lat) || isNaN(lng)) {
            alert("Por favor, preencha todos os campos obrigatórios (Nome, Latitude, Longitude).");
            return;
        }

        const payload = { nome, bairro, lat, lng, isDayOnly, isNightOnly, hasComporta, daySupervisorId, nightSupervisorId };

        if (id) {
            // Edição
            payload.id = id;
            await DatabaseService.updatePost(payload);
        } else {
            // Cadastro
            await DatabaseService.addPost(payload);
        }

        modalPost.classList.remove('active');
        if (activeTempMarker) {
            map.removeLayer(activeTempMarker);
            activeTempMarker = null;
        }

        await loadData();
    });

    // Abrir Modal Configurações
    document.getElementById('btn-open-settings').addEventListener('click', () => {
        modalSettings.classList.add('active');
    });

    // Exportar Dados
    document.getElementById('btn-export-db').addEventListener('click', async () => {
        const backupStr = await DatabaseService.exportBackup();
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(backupStr);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `backup_geo_santos_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Importar Dados Trigger
    document.getElementById('btn-trigger-import').addEventListener('click', () => {
        document.getElementById('import-db-file').click();
    });

    // Lidar com arquivo de backup JSON selecionado
    document.getElementById('import-db-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target.value || event.target.result;
                const success = await DatabaseService.importBackup(content);
                if (success) {
                    alert("Base de dados restaurada com sucesso!");
                    modalSettings.classList.remove('active');
                    await loadData();
                }
            } catch (err) {
                alert(err.message);
            }
        };
        reader.readAsText(file);
    });

    // Limpar / Zerar Banco
    document.getElementById('btn-reset-db').addEventListener('click', async () => {
        if (confirm("ATENÇÃO: Isso irá apagar TODOS os postos cadastrados e alertas ativos personalizados e restaurar a base original de Santos. Deseja continuar?")) {
            await DatabaseService.resetToDefault();
            modalSettings.classList.remove('active');
            await loadData();
            alert("Configurações originais restauradas!");
        }
    });

    // Lançar Ocorrência Rápida (Formulário Rodapé)
    document.getElementById('btn-save-incident').addEventListener('click', async () => {
        const postId = selectIncPosto.value;
        const tipo = document.getElementById('inc-tipo').value;
        const colaborador = document.getElementById('inc-colaborador').value.trim();
        const severidade = document.getElementById('inc-severidade').value;
        const detalhes = document.getElementById('inc-detalhes').value.trim();

        if (!postId || !detalhes) {
            alert("Por favor, selecione o Posto e digite uma descrição para a ocorrência.");
            return;
        }

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // Determinar supervisor responsável baseado no tipo/turno
        let supervisorId = post.daySupervisorId || post.nightSupervisorId;
        
        // Se a ocorrência for noturna (ou cadastrada à noite) atribui supervisor noturno se houver
        const horaAtual = new Date().getHours();
        if ((horaAtual >= 18 || horaAtual < 6) && post.nightSupervisorId) {
            supervisorId = post.nightSupervisorId;
        }

        await DatabaseService.addIncident({
            postId,
            tipo,
            colaborador,
            detalhes,
            supervisorId,
            severidade
        });

        // Limpar form
        document.getElementById('inc-colaborador').value = "";
        document.getElementById('inc-detalhes').value = "";

        await loadData();
        
        // Enviar aviso na IA
        addAIMessage(`Acabo de registrar o alerta de **${tipo.toUpperCase()}** no posto **${post.nome}**. O painel foi atualizado.`, 'ai');
    });

    // Funções Globais no escopo do Window para botões de modais / popups
    window.resolveIncidentEvent = async function (id) {
        await DatabaseService.resolveIncident(id);
        await loadData();
    };

    window.deletePostPrompt = async function (id) {
        const post = posts.find(p => p.id === id);
        if (!post) return;
        
        if (confirm(`Tem certeza que deseja excluir o posto "${post.nome}"? ele não aparecerá mais no mapa.`)) {
            await DatabaseService.deletePost(id);
            map.closePopup();
            await loadData();
            addAIMessage(`O posto **${post.nome}** foi removido do mapa de Santos.`, 'ai');
        }
    };

    window.editPostPrompt = function (id) {
        const post = posts.find(p => p.id === id);
        if (!post) return;
        
        map.closePopup();

        // Preencher modal
        document.getElementById('modal-post-title').textContent = "Editar Posto";
        document.getElementById('form-post-id').value = post.id;
        document.getElementById('form-post-nome').value = post.nome;
        document.getElementById('form-post-lat').value = post.lat;
        document.getElementById('form-post-lng').value = post.lng;

        const selectModalBairro = document.getElementById('form-post-bairro');
        selectModalBairro.innerHTML = '';
        const bairros = [...new Set(BAIRROS_SANTOS.map(b => b.nome))].sort();
        bairros.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            if (b === post.bairro) opt.selected = true;
            selectModalBairro.appendChild(opt);
        });

        const selectModalDaySup = document.getElementById('form-post-day-sup');
        selectModalDaySup.innerHTML = '<option value="">Sem supervisor diurno</option>';
        supervisores.filter(s => s.turno === 'diurno').forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nome;
            if (s.id === post.daySupervisorId) opt.selected = true;
            selectModalDaySup.appendChild(opt);
        });

        const selectModalNightSup = document.getElementById('form-post-night-sup');
        selectModalNightSup.innerHTML = '<option value="">Sem supervisor noturno</option>';
        supervisores.filter(s => s.turno === 'noturno').forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nome;
            if (s.id === post.nightSupervisorId) opt.selected = true;
            selectModalNightSup.appendChild(opt);
        });

        document.getElementById('form-post-dayonly').checked = post.isDayOnly;
        document.getElementById('form-post-nightonly').checked = post.isNightOnly;
        document.getElementById('form-post-hascomporta').checked = !!post.hasComporta;

        document.getElementById('form-group-day-sup').style.display = post.isNightOnly ? 'none' : 'flex';
        document.getElementById('form-group-night-sup').style.display = post.isDayOnly ? 'none' : 'flex';

        modalPost.classList.add('active');
    };

    // Ouvintes de Filtros
    [selectSupervisor, selectBairro, selectPeriodo, selectStatus, txtSearchPosto, chkShowHeatmap, selectMes].forEach(el => {
        if (el) {
            el.addEventListener('input', () => {
                renderMarkers();
                updateStats();
                updateChart();
            });
        }
    });

    // Botoes Novos (Tela Cheia, Exportacao e Desenhar Areas)
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        setTimeout(() => map.invalidateSize(), 300);
    });

    document.getElementById('btn-draw-areas')?.addEventListener('click', () => {
        showPolygons = !showPolygons;
        renderMarkers();
    });

    document.getElementById('btn-export-pdf')?.addEventListener('click', async () => {
        if (!window.html2canvas || !window.jspdf) {
            alert("Bibliotecas de exportação ainda carregando, aguarde um momento.");
            return;
        }
        
        const btn = document.getElementById('btn-export-pdf');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader"></i> Gerando PDF...';
        
        try {
            document.querySelector('.leaflet-control-container').style.display = 'none';
            const mapEl = document.getElementById('map');
            const canvas = await html2canvas(mapEl, { useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            document.querySelector('.leaflet-control-container').style.display = '';

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape');
            
            pdf.setFontSize(22);
            pdf.text("Relatório Executivo - GEO Santos", 14, 20);
            
            pdf.setFontSize(12);
            pdf.text(`Total Postos: ${posts.length}`, 14, 30);
            pdf.text(`Faltas Ativas: ${lblTotalFaltas.textContent}`, 60, 30);
            pdf.text(`Vagas Abertas: ${lblTotalDemissoes.textContent}`, 110, 30);
            
            pdf.addImage(imgData, 'PNG', 14, 40, 260, 140);
            
            pdf.save(`relatorio_executivo_geo_santos_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error(e);
            alert("Erro ao exportar PDF.");
        }
        
        btn.innerHTML = oldHtml;
        lucide.createIcons();
    });

    // --- PROCESSAMENTO E UPLOAD DE ARQUIVOS (EXCEL / CSV / TXT) ---

    const excelDropZone = document.getElementById('excel-drop-zone');
    const excelFileInput = document.getElementById('excel-file-input');

    // Trigger de clique
    excelDropZone.addEventListener('click', () => excelFileInput.click());

    // Drag and Drop classes
    excelDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        excelDropZone.classList.add('dragover');
    });

    excelDropZone.addEventListener('dragleave', () => {
        excelDropZone.classList.remove('dragover');
    });

    excelDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        excelDropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processUploadFile(files[0]);
        }
    });

    excelFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processUploadFile(file);
        }
    });

    // Lida com o processamento do arquivo
    function processUploadFile(file) {
        const fileType = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        reader.onload = function (e) {
            const data = e.target.result;
            let occurrences = [];

            if (fileType === 'xlsx' || fileType === 'xls') {
                // Ler Excel usando SheetJS
                const workbook = XLSX.read(data, { type: 'binary' });
                occurrences = ReportParser.parseExcel(workbook, posts);
            } else if (fileType === 'csv') {
                const text = new TextDecoder("utf-8").decode(data);
                occurrences = ReportParser.parseCSV(text, posts);
            } else {
                // Relatório txt puro
                const text = new TextDecoder("utf-8").decode(data);
                occurrences = ReportParser.parseRawText(text, posts);
            }

            if (occurrences.length === 0) {
                alert("Nenhuma ocorrência foi identificada neste arquivo. Verifique se os nomes dos postos no relatório conferem com o mapa.");
                return;
            }

            showImportPreview(occurrences);
        };

        if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv') {
            reader.readAsBinaryString(file);
        } else {
            // txt
            reader.readAsArrayBuffer(file);
        }
    }

    // Exibe o modal com a lista de ocorrências detectadas para confirmação
    function showImportPreview(occurrences) {
        pendingImportList = occurrences;
        const listContainer = document.getElementById('import-preview-list');
        listContainer.innerHTML = '';

        occurrences.forEach((occ, idx) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            
            const badgeClass = `badge badge-${occ.tipo}`;
            const labelTipo = occ.tipo === 'falta' ? 'Falta' : occ.tipo === 'demissao' ? 'Demissão' : occ.tipo === 'os' ? 'O.S.' : 'Obs.';
            
            // Formulário de correção: se o posto não foi identificado por nome aproximado
            let postSelectionHTML = `<strong>${occ.postoNome}</strong>`;
            if (!occ.postId) {
                postSelectionHTML = `
                    <span style="color:var(--color-danger); font-weight:600;">[NÃO IDENTIFICADO] "${occ.postoNome}"</span>
                    <select class="preview-posto-correction" data-index="${idx}" style="padding: 4px; font-size:0.75rem; margin-top:4px;">
                        <option value="">Vincular a Posto Existente...</option>
                        ${posts.map(p => `<option value="${p.id}">${p.nome} (${p.bairro})</option>`).join('')}
                    </select>
                `;
            }

            div.innerHTML = `
                <div class="preview-item-info">
                    <span class="${badgeClass}" style="align-self: flex-start; margin-bottom: 4px;">${labelTipo}</span>
                    <div class="title">${postSelectionHTML}</div>
                    <div class="subtitle">*${occ.colaborador}*: ${occ.detalhes}</div>
                </div>
                <div>
                    <button class="btn btn-secondary btn-danger" style="padding: 4px; border-radius: 4px;" onclick="window.removePendingImport(${idx})">&times; Remover</button>
                </div>
            `;

            listContainer.appendChild(div);
        });

        // Adicionar eventos de mudança nas caixas de correção manual
        setTimeout(() => {
            document.querySelectorAll('.preview-posto-correction').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const selectedPostId = e.target.value;
                    if (selectedPostId && pendingImportList[index]) {
                        const post = posts.find(p => p.id === selectedPostId);
                        pendingImportList[index].postId = selectedPostId;
                        pendingImportList[index].postoNome = post.nome;
                        pendingImportList[index].confidence = 'corrigido';
                    }
                });
            });
        }, 100);

        modalPreview.classList.add('active');
    }

    // Permite remover da lista antes de confirmar importação
    window.removePendingImport = function (index) {
        pendingImportList.splice(index, 1);
        if (pendingImportList.length === 0) {
            modalPreview.classList.remove('active');
        } else {
            showImportPreview(pendingImportList);
        }
    };

    // Confirmar a importação em lote
    document.getElementById('btn-confirm-import-preview').addEventListener('click', async () => {
        let countSaved = 0;

        for (const occ of pendingImportList) {
            if (!occ.postId) continue; // ignora se não tiver associado ao posto

            const post = posts.find(p => p.id === occ.postId);
            let supervisorId = post.daySupervisorId || post.nightSupervisorId;
            
            // Tenta achar o supervisor específico baseado no tipo/turno
            const hour = new Date().getHours();
            if ((hour >= 18 || hour < 6) && post.nightSupervisorId) {
                supervisorId = post.nightSupervisorId;
            }

            await DatabaseService.addIncident({
                postId: occ.postId,
                tipo: occ.tipo,
                colaborador: occ.colaborador,
                detalhes: occ.detalhes,
                supervisorId: supervisorId,
                severidade: occ.severidade,
                data: occ.data
            });
            countSaved++;
        }

        modalPreview.classList.remove('active');
        await loadData();

        addAIMessage(`Fiz a importação de **${countSaved} ocorrência(s)** do documento enviado. O mapa e os relatórios foram atualizados.`, 'ai');
        
        // Autogerar plano de contingências
        const response = await AIOperationalAnalyst.processQuery("Plano de contingência");
        addAIMessage(response, 'ai');
    });


    // --- INTEGRAÇÃO COM CONVERSAS DA IA ---

    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatHistory = document.getElementById('ai-chat-history');
    const btnSendAI = document.getElementById('btn-send-ai');

    // Enviar mensagem
    async function submitAIQuery(text) {
        if (!text.trim()) return;

        addAIMessage(text, 'user');
        aiChatInput.value = "";

        // Efeito digitando da IA
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message';
        typingDiv.innerHTML = '<span style="color:var(--text-muted);">Analisando dados geográficos de Santos...</span>';
        aiChatHistory.appendChild(typingDiv);
        aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

        try {
            const response = await AIOperationalAnalyst.processQuery(text);
            aiChatHistory.removeChild(typingDiv);
            addAIMessage(response, 'ai');
        } catch (e) {
            aiChatHistory.removeChild(typingDiv);
            addAIMessage("Desculpe, ocorreu um erro ao analisar a base. Tente novamente.", 'ai');
        }
    }

    // Renderiza mensagens no chat
    function addAIMessage(markdownText, sender) {
        const div = document.createElement('div');
        div.className = `ai-message ${sender === 'user' ? 'user' : ''}`;
        
        // Conversor básico de Markdown para HTML
        div.innerHTML = parseMarkdownToHTML(markdownText);
        
        aiChatHistory.appendChild(div);
        aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

        // Adicionar escuta nos links de ações da IA (.ai-action-link)
        div.querySelectorAll('.ai-action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = link.dataset.action;
                const id = link.dataset.id;

                if (action === 'focus-post') {
                    focusPostOnMap(id);
                } else if (action === 'focus-supervisor') {
                    // Setar filtro do supervisor
                    selectSupervisor.value = id;
                    renderMarkers();
                    
                    // Ajustar mapa aos limites dos postos desse supervisor
                    const targetSup = supervisores.find(s => s.id === id);
                    if (targetSup) {
                        const isDiurno = targetSup.turno === 'diurno';
                        const supPosts = posts.filter(p => 
                            (isDiurno && p.daySupervisorId === id) || 
                            (!isDiurno && p.nightSupervisorId === id)
                        );
                        if (supPosts.length > 0) {
                            const bounds = L.latLngBounds(supPosts.map(p => [p.lat, p.lng]));
                            map.fitBounds(bounds, { padding: [30, 30] });
                        }
                    }
                }
            });
        });
    }

    // Parser simples de Markdown para HTML
    function parseMarkdownToHTML(md) {
        let html = md;
        
        // Tabelas Markdown simples
        const tableRegex = /\|(.+)\|/g;
        if (md.match(tableRegex)) {
            const lines = md.split('\n');
            let inTable = false;
            let tableHTML = '<table>';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('|') && line.endsWith('|')) {
                    if (!inTable) {
                        inTable = true;
                        tableHTML += '<thead>';
                    }
                    
                    // Separador de cabeçalho
                    if (line.includes('---') || line.includes(':---')) {
                        tableHTML = tableHTML.replace('<thead>', '<tbody>'); // fecha thead abre tbody anterior
                        continue; 
                    }

                    const cells = line.split('|').slice(1, -1).map(c => c.trim());
                    tableHTML += '<tr>';
                    cells.forEach(cell => {
                        // Títulos das colunas
                        const tag = inTable && tableHTML.includes('<tbody>') ? 'td' : 'th';
                        // Converter links de ações nas células
                        let content = cell.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                        tableHTML += `<${tag}>${content}</${tag}>`;
                    });
                    tableHTML += '</tr>';
                    
                    if (inTable && !tableHTML.includes('<tbody>')) {
                        tableHTML += '</thead><tbody>'; // Garante fechamento correto se não houver divisor
                    }
                } else {
                    if (inTable) {
                        inTable = false;
                        tableHTML += '</tbody></table>';
                        lines[i] = tableHTML + '\n' + lines[i];
                        tableHTML = '<table>';
                    }
                }
            }
            html = lines.join('\n');
        }

        // Títulos (###, ####)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');

        // Negritos (**texto**)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Itálicos (*texto*)
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Listas não ordenadas (* item)
        html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
        
        // Remove <ul> duplicados de aninhamento
        html = html.replace(/<\/ul>\s*<ul>/g, '');

        // Parágrafos e quebras de linha
        html = html.replace(/\n\n/g, '<br><br>');

        return html;
    }

    // Eventos de Chat
    btnSendAI.addEventListener('click', () => {
        submitAIQuery(aiChatInput.value);
    });

    aiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitAIQuery(aiChatInput.value);
        }
    });

    // Preset de Perguntas Rápidas
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const query = btn.dataset.query;
            submitAIQuery(query);
        });
    });


    // --- CONFIGURAÇÃO GEMINI API KEY ---
    const geminiKeyInput = document.getElementById('gemini-api-key');
    const geminiKeyStatus = document.getElementById('gemini-key-status');
    const btnSaveGeminiKey = document.getElementById('btn-save-gemini-key');

    // Carrega status da chave ao iniciar
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    if (savedGeminiKey) {
        geminiKeyInput.value = "••••••••••••••••";
        geminiKeyStatus.textContent = "🟢 Chave Gemini Ativa (Gemini 2.5 Flash Habilitado).";
        geminiKeyStatus.style.color = "var(--color-success)";
    }

    // Salva a chave do Gemini
    btnSaveGeminiKey.addEventListener('click', () => {
        const keyVal = geminiKeyInput.value.trim();
        if (keyVal === "") {
            localStorage.removeItem('gemini_api_key');
            geminiKeyStatus.textContent = "Nenhuma chave ativa (Operando no modo local off-line).";
            geminiKeyStatus.style.color = "var(--text-muted)";
            alert("Chave API do Gemini removida. O painel voltou ao modo local off-line.");
        } else if (keyVal !== "••••••••••••••••") {
            localStorage.setItem('gemini_api_key', keyVal);
            geminiKeyInput.value = "••••••••••••••••";
            geminiKeyStatus.textContent = "🟢 Chave Gemini Ativa (Gemini 2.5 Flash Habilitado).";
            geminiKeyStatus.style.color = "var(--color-success)";
            alert("Chave API do Gemini salva com sucesso!");
        }
    });

    // --- STORM MODE (MODO TEMPESTADE) ---
    window.activateStormMode = function(criticalPosts) {
        document.body.classList.add('storm-mode');
        
        if (sonarGroup) {
            sonarGroup.clearLayers();
        }

        if (criticalPosts && criticalPosts.length > 0) {
            const bounds = [];
            criticalPosts.forEach(post => {
                bounds.push([post.lat, post.lng]);
            });

            // Fly to bounds se existirem postos críticos
            if (map && bounds.length > 0) {
                map.flyToBounds(L.latLngBounds(bounds), { padding: [80, 80], duration: 3.0 });
            }
        }
    };

    // --- TRAFFIC SIMULATION (SIMULAÇÃO DE TRÂNSITO) ---
    window.simulateTraffic = function() {
        if (!map) return;
        
        // Coordenadas de vias principais em Santos
        const trafficLines = [
            [[-23.9665, -46.3331], [-23.9555, -46.3290]], // Av. Ana Costa
            [[-23.9680, -46.3300], [-23.9650, -46.3150]], // Av. Conselheiro Nebias
            [[-23.9700, -46.3400], [-23.9720, -46.3200]]  // Orla da Praia
        ];

        trafficLines.forEach(lineCoords => {
            L.polyline(lineCoords, {
                color: 'var(--color-danger)',
                weight: 6,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(map).bindTooltip("Trânsito Intenso - Lentidão de 25 min", {sticky: true});
        });
        
        map.setView([-23.9608, -46.3339], 14);
    };

    // Inicializar aplicação
    window.loadDataFunc = loadData;
    window.addAIMessageFunc = addAIMessage;

    initMap();
    await loadData();
    if (window.WeatherService) {
        WeatherService.init();
    }
});
