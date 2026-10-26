// DataVotoCesf — JavaScript consolidado em um único arquivo.
// Antes de usar o Firebase, substitua os valores de exemplo abaixo pela configuração do seu app Web.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase fornecida
const firebaseConfig = {
    apiKey: "AIzaSyDBEb-TyC8wFQAG6rNsidvafhG7VN-TJEE",
    authDomain: "data-voto-2.firebaseapp.com",
    databaseURL: "https://data-voto-2-default-rtdb.firebaseio.com",
    projectId: "data-voto-2",
    storageBucket: "data-voto-2.firebasestorage.app",
    messagingSenderId: "123075628669",
    appId: "1:123075628669:web:80adcb64fd98d8963f6b14"
};

// Inicializa a aplicação e exporta o banco Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

function initSurvey() {
  const form = document.querySelector("#survey-form");
  const message = document.querySelector("#form-message");
  const submitButton = document.querySelector("#submit-button");
  const progressFill = document.querySelector("#progress-fill");
  const counter = document.querySelector("#selection-counter");
  const pautaInputs = [...document.querySelectorAll('input[name="pautas"]')];

  let db;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Falha ao iniciar Firebase:", error);
    showMessage("Não foi possível iniciar a conexão. Confira a configuração do Firebase.", "error");
  }

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `form-message ${type === "success" ? "success" : ""}`;
  }

  function updatePautas() {
    const checked = pautaInputs.filter(input => input.checked);
    counter.textContent = `${checked.length} de 3 selecionadas`;
    pautaInputs.forEach(input => {
      input.disabled = checked.length >= 3 && !input.checked;
    });
    updateProgress();
  }

  function updateProgress() {
    const required = [...form.querySelectorAll("[required]")];
    const complete = required.filter(input => input.type === "checkbox" ? input.checked : input.value.trim() !== "").length;
    const pautaComplete = pautaInputs.some(input => input.checked);
    const percent = Math.round(((complete + (pautaComplete ? 1 : 0)) / (required.length + 1)) * 100);
    progressFill.style.width = `${Math.min(percent, 100)}%`;
  }

  pautaInputs.forEach(input => input.addEventListener("change", updatePautas));
  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);
  updatePautas();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage("");

    if (!db) {
      showMessage("Firebase não está configurado. Confira js/firebase-config.js.");
      return;
    }

    const pautas = pautaInputs.filter(input => input.checked).map(input => input.value);
    if (pautas.length < 1 || pautas.length > 3) {
      showMessage("Selecione de 1 a 3 pautas prioritárias.");
      return;
    }

    const data = new FormData(form);
    const moradores = Number(data.get("moradores"));
    const trabalhadores = Number(data.get("trabalhadores"));

    if (!Number.isInteger(moradores) || moradores < 1 || moradores > 30 ||
        !Number.isInteger(trabalhadores) || trabalhadores < 0 || trabalhadores > moradores) {
      showMessage("Confira os números: moradores deve ser de 1 a 30 e trabalhadores não pode superar o total de moradores.");
      return;
    }

    const resposta = {
      faixaEtaria: String(data.get("faixaEtaria")),
      bairro: String(data.get("bairro")).trim(),
      rotina: String(data.get("rotina")),
      rendaFamiliar: String(data.get("rendaFamiliar")),
      moradores: moradores, // Number, não String
      trabalhadores: trabalhadores, // Number, não String
      certezaVoto: String(data.get("certezaVoto")),
      pautas: pautas,
      createdAt: serverTimestamp()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    try {
      await addDoc(collection(db, "datavoto_cesf_respostas"), resposta);
      form.reset();
      updatePautas();
      updateProgress();
      showMessage("Resposta enviada com sucesso! Obrigado por contribuir com a pesquisa.", "success");
      window.scrollTo({ top: document.querySelector(".form-card").offsetTop - 20, behavior: "smooth" });
    } catch (error) {
      console.error("Erro ao gravar resposta:", error);
      showMessage("Não foi possível enviar agora. Confira sua conexão ou tente novamente mais tarde.");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Enviar respostas <span aria-hidden="true">→</span>';
    }
  });
}

function initAdmin() {
  const loginPanel = document.querySelector("#login-panel");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#login-form");
  const loginMessage = document.querySelector("#login-message");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const loginButton = document.querySelector("#login-button");
  const charts = {};

  let db;
  let auth;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    showLoginMessage("Não foi possível iniciar o Firebase. Confira js/firebase-config.js.");
    console.error(error);
  }

  function showLoginMessage(text) {
    loginMessage.textContent = text;
  }
  function countBy(rows, key) {
    return rows.reduce((result, row) => {
      const value = row[key] || "Não informado";
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {});
  }
  function drawChart(id, type, labels, values, options = {}) {
    if (charts[id]) charts[id].destroy();
    const canvas = document.getElementById(id);
    charts[id] = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label: options.label || "Respostas",
          data: values,
          backgroundColor: options.colors || ["#7656d6", "#a18aef", "#c9bbf7", "#e3dcfb", "#5dbb9a", "#f1b66b", "#ed8ca1", "#72a9df"],
          borderColor: "#ffffff",
          borderWidth: type === "bar" ? 0 : 2,
          borderRadius: type === "bar" ? 7 : 0,
          maxBarThickness: 38
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: options.horizontal ? "y" : "x",
        plugins: {
          legend: { display: type === "doughnut" || type === "pie", position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { family: "DM Sans", size: 10 } } },
          tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.raw}` } }
        },
        scales: type === "bar" ? {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { display: false }, border: { display: false } },
          y: { grid: { color: "#f0edf6" }, border: { display: false }, ticks: { font: { family: "DM Sans", size: 10 } } }
        } : {}
      }
    });
  }
  function average(rows, key) {
    if (!rows.length) return "0,0";
    const total = rows.reduce((sum, row) => sum + (typeof row[key] === "number" ? row[key] : 0), 0);
    return (total / rows.length).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function renderDashboard(rows) {
    document.querySelector("#total-respostas").textContent = rows.length.toLocaleString("pt-BR");
    document.querySelector("#media-moradores").textContent = average(rows, "moradores");
    document.querySelector("#media-trabalhadores").textContent = average(rows, "trabalhadores");

    const age = countBy(rows, "faixaEtaria");
    drawChart("idade-chart", "bar", Object.keys(age), Object.values(age), { horizontal: true });
    const routine = countBy(rows, "rotina");
    drawChart("rotina-chart", "doughnut", Object.keys(routine), Object.values(routine));
    const income = countBy(rows, "rendaFamiliar");
    drawChart("renda-chart", "bar", Object.keys(income), Object.values(income), { horizontal: true });
    const vote = countBy(rows, "certezaVoto");
    drawChart("voto-chart", "doughnut", Object.keys(vote), Object.values(vote));
    const topics = {};
    rows.forEach(row => (Array.isArray(row.pautas) ? row.pautas : []).forEach(topic => {
      topics[topic] = (topics[topic] || 0) + 1;
    }));
    const topicLabels = Object.keys(topics).sort((a, b) => topics[b] - topics[a]);
    drawChart("pautas-chart", "bar", topicLabels, topicLabels.map(topic => topics[topic]), { horizontal: true, label: "Seleções", colors: "#8b70e8" });
  }

  async function loadResponses() {
    dashboardMessage.textContent = "Carregando respostas…";
    try {
      // getDocs consulta a coleção; orderBy usa o timestamp criado pelo servidor.
      const responseQuery = query(collection(db, "datavoto_cesf_respostas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(responseQuery);
      const rows = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
      renderDashboard(rows);
      dashboardMessage.textContent = rows.length ? `Dados atualizados. ${rows.length} resposta(s) carregada(s).` : "Ainda não há respostas registradas.";
      dashboardMessage.className = "form-message success";
    } catch (error) {
      console.error("Erro ao consultar Firestore:", error);
      dashboardMessage.className = "form-message";
      dashboardMessage.textContent = "Não foi possível consultar os dados. Verifique se sua conta tem permissão de leitura nas regras do Firestore.";
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!auth) return showLoginMessage("Firebase não está configurado.");
    loginButton.disabled = true;
    loginButton.textContent = "Verificando…";
    showLoginMessage("");
    try {
      await signInWithEmailAndPassword(auth, document.querySelector("#admin-email").value.trim(), document.querySelector("#admin-password").value);
    } catch (error) {
      console.error("Falha de autenticação:", error);
      showLoginMessage("Não foi possível entrar. Confira e-mail/senha e se a conta administrativa foi criada no Firebase Authentication.");
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Entrar no painel <span>→</span>';
    }
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    if (auth) await signOut(auth);
  });

  if (auth) {
    onAuthStateChanged(auth, async user => {
      if (user) {
        loginPanel.classList.add("hidden");
        dashboard.classList.remove("hidden");
        await loadResponses();
      } else {
        dashboard.classList.add("hidden");
        loginPanel.classList.remove("hidden");
      }
    });
  }
}

// Cada página inicia somente o código de que precisa.
if (document.querySelector("#survey-form")) initSurvey();
if (document.querySelector("#login-form")) initAdmin();

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const form = document.getElementById("pesquisaForm");
const mensagemFeedback = document.getElementById("mensagemFeedback");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Captura dos valores e conversão explícita para Number (Exigência do briefing)
    const moradoresVal = Number(document.getElementById("moradores").value);
    const trabalhadoresVal = Number(document.getElementById("trabalhadores").value);

    const dadosResposta = {
        faixaEtaria: document.getElementById("faixaEtaria").value,
        bairro: document.getElementById("bairro").value.trim(),
        rotina: document.getElementById("rotina").value,
        rendaFamiliar: document.getElementById("rendaFamiliar").value,
        moradores: moradoresVal,
        trabalhadores: trabalhadoresVal,
        certezaVoto: document.getElementById("certezaVoto").value,
        pautaPrioritaria: document.getElementById("pautaPrioritaria").value,
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "datavoto_cesf_respostas"), dadosResposta);
        
        mensagemFeedback.textContent = "Resposta registrada com sucesso! Obrigado por colaborar.";
        mensagemFeedback.className = "success";
        mensagemFeedback.classList.remove("hidden");
        form.reset();
    } catch (error) {
        console.error("Erro ao salvar no Firestore: ", error);
        mensagemFeedback.textContent = "Ocorreu um erro ao enviar sua resposta. Tente novamente.";
        mensagemFeedback.className = "error";
        mensagemFeedback.classList.remove("hidden");
    }
});

import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const SENHA_CORRETA = "admin123"; // Senha simples definida para o painel

const loginSection = document.getElementById("loginSection");
const adminContent = document.getElementById("adminContent");
const btnLogin = document.getElementById("btnLogin");
const senhaAdmin = document.getElementById("senhaAdmin");
const erroLogin = document.getElementById("erroLogin");

let chartInstance = null;

btnLogin.addEventListener("click", () => {
    if (senhaAdmin.value === SENHA_CORRETA) {
        loginSection.classList.add("hidden");
        adminContent.classList.remove("hidden");
        carregarDadosPainel();
    } else {
        erroLogin.classList.remove("hidden");
    }
});

async function carregarDadosPainel() {
    try {
        const querySnapshot = await getDocs(collection(db, "datavoto_cesf_respostas"));
        
        let total = 0;
        let somaMoradores = 0;
        let somaTrabalhadores = 0;
        
        const contagemPautas = {
            "Educacao": 0,
            "Saude": 0,
            "Seguranca": 0,
            "Infraestrutura": 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            total++;

            // Agregação de dados numéricos para a média
            if (typeof data.moradores === "number") {
                somaMoradores += data.moradores;
            }
            if (typeof data.trabalhadores === "number") {
                somaTrabalhadores += data.trabalhadores;
            }

            // Agregação de pautas
            if (contagemPautas[data.pautaPrioritaria] !== undefined) {
                contagemPautas[data.pautaPrioritaria]++;
            }
        });

        // Atualização de métricas em tela
        document.getElementById("totalRespostas").textContent = total;
        document.getElementById("mediaMoradores").textContent = total > 0 ? (somaMoradores / total).toFixed(1) : "0.0";
        document.getElementById("mediaTrabalhadores").textContent = total > 0 ? (somaTrabalhadores / total).toFixed(1) : "0.0";

        // Geração do gráfico interativo
        gerarGrafico(contagemPautas);

    } catch (error) {
        console.error("Erro ao buscar dados do Firestore:", error);
    }
}

function gerarGrafico(dadosPautas) {
    const ctx = document.getElementById("graficoPautas").getContext("2d");

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Educação", "Saúde", "Segurança", "Infraestrutura"],
            datasets: [{
                label: "Votos por Pauta",
                data: [
                    dadosPautas.Educacao,
                    dadosPautas.Saude,
                    dadosPautas.Seguranca,
                    dadosPautas.Infraestrutura
                ],
                backgroundColor: ["#2e7d32", "#1976d2", "#f57c00", "#c2185b"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}