import { useEffect, useRef, useState } from "react";

export interface PromessaAlarm {
  id: number;
  clienteNome: string;
  clienteTelefone?: string | null;
  valor?: string | null;
  horarioPromessa?: string | null;
  dataPromessa: string | Date;
  observacoes?: string | null;
}

/**
 * Hook que verifica a cada minuto se há promessas com horário coincidindo com o horário atual.
 * Dispara um alarme sonoro e retorna a lista de promessas ativas no momento.
 */
export function usePromessaAlarm(promessasHoje: PromessaAlarm[] | undefined) {
  const [alarmeAtivo, setAlarmeAtivo] = useState<PromessaAlarm[]>([]);
  const disparadasRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);

  function tocarAlerta() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current = ctx;
      // Toca 3 beeps
      [0, 0.4, 0.8].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.3);
      });
    } catch {
      // Fallback silencioso se AudioContext não disponível
    }
  }

  useEffect(() => {
    function verificar() {
      if (!promessasHoje || promessasHoje.length === 0) return;
      const agora = new Date();
      const horaAtual = agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0");

      const novasAlarmes: PromessaAlarm[] = [];
      for (const p of promessasHoje) {
        if (!p.horarioPromessa) continue;
        if (p.horarioPromessa === horaAtual && !disparadasRef.current.has(p.id)) {
          novasAlarmes.push(p);
          disparadasRef.current.add(p.id);
        }
      }
      if (novasAlarmes.length > 0) {
        setAlarmeAtivo(prev => [...prev, ...novasAlarmes]);
        tocarAlerta();
      }
    }

    verificar(); // Verificar imediatamente ao montar
    const interval = setInterval(verificar, 30000); // Verificar a cada 30 segundos
    return () => clearInterval(interval);
  }, [promessasHoje]);

  function dispensarAlarme(id: number) {
    setAlarmeAtivo(prev => prev.filter(p => p.id !== id));
  }

  function dispensarTodos() {
    setAlarmeAtivo([]);
  }

  return { alarmeAtivo, dispensarAlarme, dispensarTodos };
}
