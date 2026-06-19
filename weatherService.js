// Serviço de Clima e Acionamento Automático de Comportas (weatherService.js)

class WeatherService {
    static ALAGAMENTO_THRESHOLD_MM = 10;
    static intervalId = null;

    static async init() {
        await this.fetchWeather();
        // Atualiza a cada 15 minutos (900000 ms)
        this.intervalId = setInterval(() => this.fetchWeather(), 15 * 60 * 1000);
        
        // MODO DEMONSTRAÇÃO: Simular chuva forte (35mm/h) após 4 segundos
        setTimeout(() => {
            console.log("Simulando chuva forte para demonstração...");
            this.checkAlagamento(35.0);
        }, 4000);
    }

    static async fetchWeather() {
        try {
            const lblWeather = document.getElementById('lbl-weather');
            if (lblWeather) lblWeather.textContent = "Clima: Buscando...";

            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.9608&longitude=-46.3339&current=precipitation,weather_code&daily=precipitation_sum,precipitation_probability_max&timezone=America%2FSao_Paulo');
            const data = await response.json();

            const precipitation = data.current.precipitation || 0;
            
            if (lblWeather) {
                let icon = "cloud-rain";
                if (precipitation === 0) icon = "sun";
                else if (precipitation > 10) icon = "cloud-lightning";
                
                lblWeather.innerHTML = `<i data-lucide="${icon}" style="width: 14px; height: 14px;"></i> Clima: ${precipitation.toFixed(1)} mm/h`;
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }

            await this.checkAlagamento(precipitation);
            
            // Verifica previsão de amanhã apenas 1 vez (não fica floodando)
            if (!this.tomorrowAlertSent && data.daily && data.daily.precipitation_sum && data.daily.precipitation_sum.length > 1) {
                const rainTomorrow = data.daily.precipitation_sum[1];
                const probTomorrow = data.daily.precipitation_probability_max[1];
                if (rainTomorrow > 20 && probTomorrow > 60) {
                    this.tomorrowAlertSent = true;
                    if (window.addAIMessageFunc) {
                        window.addAIMessageFunc(`⚠️ **Previsão para Amanhã:** Risco de Tempestade. Previsão de ${rainTomorrow}mm com ${probTomorrow}% de chance. Prepare o efetivo para acionamento de comportas.`, 'ai');
                    }
                }
            }

        } catch (error) {
            console.error("Erro ao buscar dados do clima:", error);
            const lblWeather = document.getElementById('lbl-weather');
            if (lblWeather) lblWeather.innerHTML = `<i data-lucide="cloud-off" style="width: 14px; height: 14px;"></i> Indisponível`;
        }
    }

    static async checkAlagamento(precipitation) {
        if (precipitation >= this.ALAGAMENTO_THRESHOLD_MM) {
            const posts = await DatabaseService.getPosts();
            const ocorrencias = await DatabaseService.getIncidents();
            
            const postsComComporta = posts.filter(p => p.hasComporta);
            let novosAlertas = 0;

            for (const post of postsComComporta) {
                // Verifica se já existe um alerta de alagamento pendente para este posto
                const hasActiveAlagamento = ocorrencias.some(o => o.postId === post.id && o.tipo === 'alagamento' && o.status === 'pendente');
                
                if (!hasActiveAlagamento) {
                    // Determinar supervisor baseado na hora atual
                    let supervisorId = post.daySupervisorId || post.nightSupervisorId;
                    const horaAtual = new Date().getHours();
                    if ((horaAtual >= 18 || horaAtual < 6) && post.nightSupervisorId) {
                        supervisorId = post.nightSupervisorId;
                    }

                    await DatabaseService.addIncident({
                        postId: post.id,
                        tipo: 'alagamento',
                        colaborador: 'SISTEMA AUTOMÁTICO',
                        detalhes: `Alerta de Chuva Forte (${precipitation.toFixed(1)}mm/h). Acionar comportas imediatamente!`,
                        supervisorId: supervisorId,
                        severidade: 'alta'
                    });
                    novosAlertas++;
                }
            }

            if (novosAlertas > 0) {
                // Atualizar UI se o app.js já exportou a função
                if (window.loadDataFunc) {
                    await window.loadDataFunc();
                }
                if (window.addAIMessageFunc) {
                    let msg = `⚠️ **ALERTA METEOROLÓGICO:** Chuva forte detectada em Santos (${precipitation.toFixed(1)}mm/h). O sistema gerou ${novosAlertas} novas ocorrências automáticas para fechamento de comportas.\n\n`;
                    msg += `**Ligue imediatamente para os postos:**\n\n`;
                    msg += `| Posto | Bairro | Telefone |\n|:---|:---|:---|\n`;
                    postsComComporta.forEach(p => {
                        msg += `| ${p.nome} | ${p.bairro} | ${p.telefone || 'Não cadastrado'} |\n`;
                    });
                    
                    window.addAIMessageFunc(msg, 'ai');
                }
            }

            // Ativar Modo Tempestade visual se existir a função
            if (window.activateStormMode) {
                window.activateStormMode(postsComComporta);
            }
        }
    }
}

window.WeatherService = WeatherService;
