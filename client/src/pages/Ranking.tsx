import { useState, useEffect, useRef } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trophy, Star, Zap, Target, TrendingUp, Award } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// Componente de confetes
function Confetes({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: { x: number; y: number; r: number; d: number; color: string; tilt: number; tiltAngle: number; tiltAngleInc: number }[] = [];
    const colors = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#fbbf24"];
    for (let i = 0; i < 200; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 200 + 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleInc: Math.random() * 0.07 + 0.05,
      });
    }

    let angle = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) * 1.5;
        p.x += Math.sin(angle);
        p.tilt = Math.sin(p.tiltAngle) * 12;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animRef.current); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" style={{ opacity: 0.7 }} />;
}

// Medalha por posição
function Medalha({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-3xl">🥇</span>;
  if (pos === 2) return <span className="text-3xl">🥈</span>;
  if (pos === 3) return <span className="text-3xl">🥉</span>;
  return <span className="text-xl font-bold text-gray-400">#{pos}</span>;
}

// Verifica se é o último dia do mês
function isUltimoDiaMes() {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  return amanha.getMonth() !== hoje.getMonth();
}

export default function Ranking() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [confetes, setConfetes] = useState(false);
  const [mostrarCelebracao, setMostrarCelebracao] = useState(false);

  const { data: ranking, isLoading } = trpc.rankings.automatico.useQuery({ mes, ano });

  const ehMesAtual = mes === now.getMonth() + 1 && ano === now.getFullYear();
  const ehFimDeMes = ehMesAtual && isUltimoDiaMes();
  const vencedora = ranking && ranking.length > 0 ? ranking[0] : null;

  useEffect(() => {
    if (ehFimDeMes && vencedora) {
      setMostrarCelebracao(true);
      setConfetes(true);
      const t = setTimeout(() => setConfetes(false), 8000);
      return () => clearTimeout(t);
    }
  }, [ehFimDeMes, vencedora]);

  const navMes = (dir: number) => {
    if (dir === -1) { if (mes === 1) { setMes(12); setAno(ano - 1); } else setMes(mes - 1); }
    else { if (mes === 12) { setMes(1); setAno(ano + 1); } else setMes(mes + 1); }
  };

  const top3 = ranking?.slice(0, 3) ?? [];
  const resto = ranking?.slice(3) ?? [];

  // Ordenar pódio: 2º, 1º, 3º (visual)
  const podio = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : top3;

  const alturas = top3.length >= 3 ? [80, 120, 60] : top3.length === 2 ? [80, 120] : [120];
  const posicoes = top3.length >= 3 ? [2, 1, 3] : top3.length === 2 ? [2, 1] : [1];

  return (
    <LifeDashboardLayout title="Ranking">
      <Confetes active={confetes} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking de Consultoras
            </h2>
            <p className="text-sm text-gray-500">Quem coletou mais no mês vence! Zera todo dia 1º.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navMes(-1)} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[130px] text-center">{MESES[mes-1]} {ano}</div>
            <Button variant="outline" size="icon" onClick={() => navMes(1)} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Banner de celebração no último dia do mês */}
        {mostrarCelebracao && vencedora && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-6 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/80 via-orange-400/80 to-pink-500/80 animate-pulse" />
            <div className="relative z-10 text-center">
              <div className="text-5xl mb-2">🏆🎉🥳</div>
              <h3 className="text-2xl font-black mb-1">PARABÉNS, {vencedora.nomeConsultor.split(" ")[0].toUpperCase()}!</h3>
              <p className="text-lg font-semibold opacity-90">Você é a campeã de {MESES[mes-1]}!</p>
              <p className="text-3xl font-black mt-2">{fmt(vencedora.valorColetado)} coletados!</p>
              <div className="flex justify-center gap-2 mt-3">
                {["⭐","🌟","✨","💫","🔥","💪","👑"].map((e, i) => (
                  <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{e}</span>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="absolute top-3 right-3 text-white/70 hover:text-white hover:bg-white/20"
              onClick={() => setMostrarCelebracao(false)}>✕</Button>
          </div>
        )}

        {/* Banner de aviso fim de mês */}
        {ehFimDeMes && !mostrarCelebracao && vencedora && (
          <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏁</span>
              <div>
                <p className="font-bold">Último dia do mês!</p>
                <p className="text-sm opacity-90">{vencedora.nomeConsultor} está liderando com {fmt(vencedora.valorColetado)}</p>
              </div>
            </div>
            <Button size="sm" className="bg-white text-indigo-600 hover:bg-white/90 font-bold"
              onClick={() => { setMostrarCelebracao(true); setConfetes(true); setTimeout(() => setConfetes(false), 8000); }}>
              🎉 Celebrar!
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : !ranking || ranking.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Trophy className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma venda registrada em {MESES[mes-1]} {ano}</p>
              <p className="text-gray-400 text-sm mt-1">O ranking aparecerá assim que houver vendas no período</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pódio visual */}
            {top3.length > 0 && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-b from-indigo-50 to-white p-6">
                  <h3 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">🏆 Pódio</h3>
                  <div className="flex items-end justify-center gap-4">
                    {podio.map((r, idx) => {
                      const pos = posicoes[idx];
                      const alt = alturas[idx];
                      const bgColors = ["bg-gray-200","bg-yellow-400","bg-amber-600"];
                      const textColors = ["text-gray-700","text-yellow-800","text-amber-900"];
                      const borderColors = ["border-gray-300","border-yellow-500","border-amber-700"];
                      const colorIdx = pos === 1 ? 1 : pos === 2 ? 0 : 2;
                      return (
                        <div key={r.consultorId} className="flex flex-col items-center gap-2">
                          <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg border-2 border-indigo-300 mx-auto mb-1">
                              {r.nomeConsultor.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xs font-semibold text-gray-700 max-w-[80px] text-center leading-tight">{r.nomeConsultor.split(" ")[0]}</p>
                            <p className="text-xs font-bold text-indigo-600 mt-0.5">{fmt(r.valorColetado)}</p>
                          </div>
                          <div
                            className={`w-20 ${bgColors[colorIdx]} ${borderColors[colorIdx]} border-2 rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all`}
                            style={{ height: `${alt}px` }}
                          >
                            <span className={`text-2xl font-black ${textColors[colorIdx]}`}>{pos}°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* Tabela completa */}
            <Card className="border-0 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  Classificação Completa — {MESES[mes-1]} {ano}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {ranking.map((r, i) => {
                  const maxColetado = ranking[0]?.valorColetado || 1;
                  const pct = (r.valorColetado / maxColetado) * 100;
                  const rowBg = i === 0 ? "bg-yellow-50" : i === 1 ? "bg-gray-50" : i === 2 ? "bg-amber-50" : "";
                  return (
                    <div key={r.consultorId} className={`p-4 ${rowBg}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center shrink-0">
                          <Medalha pos={i + 1} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{r.nomeConsultor}</span>
                              {i === 0 && ehMesAtual && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Zap className="w-3 h-3" />Líder</span>}
                            </div>
                            <span className="text-sm font-black text-indigo-600">{fmt(r.valorColetado)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-500" : "bg-indigo-400"}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{r.totalReunioesFeitas} reuniões</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{r.totalVendas} vendas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{r.percentualFechamento}% fechamento</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{fmt(r.valorFaturado)} faturado</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Regras do ranking */}
            <Card className="border-0 shadow-sm bg-indigo-50">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Regras do Ranking
                </h4>
                <ul className="space-y-1 text-xs text-indigo-600">
                  <li>• Vence quem <strong>coletar mais</strong> no mês (do dia 1 ao último dia)</li>
                  <li>• Apenas o <strong>valor coletado no mês vigente</strong> conta — parcelas de meses anteriores não entram</li>
                  <li>• O ranking <strong>zera automaticamente</strong> no dia 1 de cada mês</li>
                  <li>• No último dia do mês, a vencedora recebe uma celebração especial 🎉</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
