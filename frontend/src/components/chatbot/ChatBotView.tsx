import * as React from "react";
import { Bot, Send, User, Loader2, FileText, Users, ShoppingBag, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { navigate } from "astro/virtual-modules/transitions-router.js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseType?: "text" | "table" | "chart";
  tableData?: TableData;
  chartData?: ChartData;
}

interface TableData {
  columns: string[];
  rows: any[][];
  title?: string;
}

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  values: number[];
}

const API_URL = "https://bot.diogofabricio17.workers.dev";

export function ChatBotView() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy tu asistente de IA. Puedo ayudarte a analizar la información sobre tus ventas, clientes y gastos. ¿Qué te gustaría saber?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleTemplateClick = (route: string) => {
    navigate(`${route}?modal=register`);
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setShowTemplates(false);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) {
        throw new Error("Error en el servidor");
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw new Error("Formato de respuesta inválido");
      }
      
      // Validar si el formato es mínimamente el que esperamos
      if (!data || typeof data.type !== 'string') {
        throw new Error("Formato de respuesta no reconocido");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "",
        timestamp: new Date(),
        responseType: data.type === "confirmation" ? "text" : data.type,
        tableData: data.data?.table ? {
          columns: data.data.table.columns || [],
          rows: data.data.table.rows || [],
          title: data.data.table.title,
        } : undefined,
        chartData: data.data?.chart ? {
          type: data.data.chart.type || "bar",
          title: data.data.chart.title || "Gráfico",
          labels: data.data.chart.labels || [],
          values: data.data.chart.values || [],
        } : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, hubo un problema al procesar la respuesta. Por favor, intenta hacer tu pregunta de nuevo o de otra manera.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderTable = (tableData: TableData) => (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {tableData.title && (
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700">{tableData.title}</h4>
        </div>
      )}
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-slate-200 hover:bg-transparent">
            {tableData.columns.map((col, i) => (
              <TableHead key={i} className="text-xs font-semibold text-slate-700 whitespace-nowrap px-4 py-3">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
              {Array.isArray(row) ? row.map((cell, colIndex) => (
                <TableCell key={colIndex} className="text-sm text-slate-600 px-4 py-3 whitespace-nowrap">
                  {cell !== null && cell !== undefined ? String(cell) : "-"}
                </TableCell>
              )) : tableData.columns.map((col, colIndex) => (
                <TableCell key={colIndex} className="text-sm text-slate-600 px-4 py-3 whitespace-nowrap">
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderChart = (chartData: ChartData) => {
    const maxValue = Math.max(...chartData.values);
    
    return (
      <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700 mb-4">{chartData.title}</h4>
        <div className="space-y-3">
          {chartData.labels.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-24 truncate">{label}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-md transition-all"
                  style={{ width: `${(chartData.values[i] / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-12 text-right">
                {chartData.values[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Asistente IA</h2>
          <p className="text-xs text-slate-500">Consulta tu base de datos</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-600">En línea</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[95%] md:max-w-[85%] flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-[#30b7ff] text-white"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === "user"
                    ? "bg-[#30b7ff] text-white rounded-br-md"
                    : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                }`}
              >
                {message.responseType === "table" && message.tableData ? (
                  <div className="space-y-2">
                    {message.content && message.content !== message.tableData.title && (
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    )}
                    {renderTable(message.tableData)}
                  </div>
                ) : message.responseType === "chart" && message.chartData ? (
                  <div className="space-y-2">
                    {message.content && message.content !== message.chartData.title && (
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    )}
                    {renderChart(message.chartData)}
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user" ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-bl-md shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="relative flex items-end gap-2 w-full mt-1 min-h-[48px]">
          {showTemplates && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Accesos Rápidos
              </div>
              <button
                onClick={() => handleTemplateClick("/clientes")}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Users className="h-4 w-4 text-blue-500" />
                Insertar Cliente
              </button>
              <button
                onClick={() => handleTemplateClick("/ventas")}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50 text-left"
              >
                <ShoppingBag className="h-4 w-4 text-emerald-500" />
                Insertar Venta
              </button>
              <button
                onClick={() => handleTemplateClick("/gastos")}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50 text-left"
              >
                <Receipt className="h-4 w-4 text-rose-500" />
                Insertar Gasto
              </button>
            </div>
          )}
          <Button
            onClick={() => setShowTemplates(!showTemplates)}
            variant="outline"
            className={`h-12 w-12 p-0 rounded-xl border-slate-200 shrink-0 transition-colors flex items-center justify-center ${showTemplates ? 'bg-slate-100 text-[#30b7ff]' : 'text-slate-500 hover:text-slate-700'}`}
            title="Accesos rápidos"
          >
            <FileText className="h-5 w-5" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu pregunta o solicitud..."
            disabled={isLoading}
            className="min-h-[48px] h-[48px] max-h-[150px] resize-none rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#30b7ff] focus:border-transparent transition-all py-3 px-4 scrollbar-thin"
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 p-0 rounded-xl bg-[#30b7ff] hover:bg-[#209fdf] text-white font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-3">
          Powered by IA • Consulta tu base de datos en lenguaje natural
        </p>
      </div>
    </div>
  );
}