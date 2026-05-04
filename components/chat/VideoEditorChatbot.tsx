"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Video, Music, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "template" | "music" | "effect";
  metadata?: any;
}

interface ChatbotProps {
  mode?: "floating" | "dashboard" | "templates";
  context?: string;
}

export default function VideoEditorChatbot({ mode = "floating", context = "" }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message based on context
      const welcomeMessage = getWelcomeMessage(context);
      setMessages([{
        id: "1",
        text: welcomeMessage,
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      }]);
    }
  }, [isOpen, context, messages.length]);

  const getWelcomeMessage = (ctx: string) => {
    switch (ctx) {
      case "templates":
        return "🎬 Hello! I'm your video editing assistant. I can help you find the perfect template for your project. What type of video are you creating today?";
      case "dashboard":
        return "🚀 Welcome back! Need help with your video projects? I can assist with editing, templates, or any technical questions.";
      default:
        return "👋 Hi! I'm your AI video editing assistant. I can help you with:\n\n🎯 Template selection\n🎵 Music recommendations\n✨ Video effects\n🔧 Technical support\n\nHow can I help you today?";
    }
  };

  const generateBotResponse = async (userMessage: string): Promise<Message> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Template-related queries
    if (lowerMessage.includes("template") || lowerMessage.includes("style")) {
      if (lowerMessage.includes("trending") || lowerMessage.includes("viral")) {
        return {
          id: Date.now().toString(),
          text: "🔥 Here are our trending templates:\n\n• **Viral Pop Explosion** - High-energy cuts with trending music\n• **Couple Goals Edit** - Romantic transitions\n• **Trap Beat Vibes** - Urban style with bold effects\n\nWould you like me to show you preview of any of these?",
          sender: "bot",
          timestamp: new Date(),
          type: "template",
          metadata: { templates: ["viral-pop", "couple-goals", "trap-beat"] }
        };
      }
      
      if (lowerMessage.includes("romantic") || lowerMessage.includes("love")) {
        return {
          id: Date.now().toString(),
          text: "💕 Perfect for romantic content! I recommend:\n\n• **Romantic Calm** - Soft transitions with warm tones\n• **Love Story** - Dreamy effects with sentimental music\n• **Sweet Moments** - Gentle color grading\n\nWant to see how these look with your video?",
          sender: "bot",
          timestamp: new Date(),
          type: "template",
          metadata: { templates: ["romantic-calm", "love-story", "sweet-moments"] }
        };
      }
    }

    // Music-related queries
    if (lowerMessage.includes("music") || lowerMessage.includes("song")) {
      return {
        id: Date.now().toString(),
        text: "🎵 Here are trending music options:\n\n• **Viral Hit** - Perfect for TikTok/Reels\n• **Trap Beat** - Urban energy\n• **Romantic Calm** - For love stories\n• **EDM Drop** - High-energy dance\n\nI can automatically sync these with your chosen template. Which style interests you?",
        sender: "bot",
        timestamp: new Date(),
        type: "music",
        metadata: { songs: ["viral-hit", "trap-beat", "romantic-calm", "edm-drop"] }
      };
    }

    // Technical help
    if (lowerMessage.includes("help") || lowerMessage.includes("problem") || lowerMessage.includes("issue")) {
      return {
        id: Date.now().toString(),
        text: "🔧 I'm here to help! Common solutions:\n\n• **Video not processing?** Check format (MP4, MOV)\n• **Music not playing?** Enable browser audio\n• **Template not applying?** Refresh and try again\n\nDescribe your specific issue and I'll provide detailed help!",
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
    }

    // Default response
    const responses = [
      "🎬 I can help you create amazing videos! What specific aspect would you like to know about?",
      "✨ Whether you need template suggestions, music recommendations, or technical help - I've got you covered!",
      "🚀 Let's create something amazing together! What kind of video are you working on?",
      "🎯 From trending effects to perfect music matching - I'm your video editing expert!"
    ];

    return {
      id: Date.now().toString(),
      text: responses[Math.floor(Math.random() * responses.length)],
      sender: "bot",
      timestamp: new Date(),
      type: "text"
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate bot thinking
    await new Promise(resolve => setTimeout(resolve, 1000));

    const botResponse = await generateBotResponse(input);
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getQuickActions = () => {
    switch (context) {
      case "templates":
        return [
          { icon: Sparkles, label: "Trending Templates", action: "Show me trending templates" },
          { icon: Music, label: "Music Match", action: "What music goes with this template?" },
          { icon: Palette, label: "Style Guide", action: "Help me choose a style" }
        ];
      case "dashboard":
        return [
          { icon: Video, label: "Project Help", action: "Help with my current project" },
          { icon: Sparkles, label: "Effects", action: "What effects should I use?" },
          { icon: Music, label: "Audio Issues", action: "Music not playing help" }
        ];
      default:
        return [
          { icon: Sparkles, label: "Templates", action: "Show me templates" },
          { icon: Music, label: "Music", action: "Music recommendations" },
          { icon: Video, label: "Get Started", action: "How do I start?" }
        ];
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  if (mode === "floating") {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        {!isOpen ? (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
        ) : (
          <Card className="w-80 h-96 shadow-2xl border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <span className="font-semibold">Video Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === "user"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.sender === "bot" && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        {message.sender === "user" && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <p className="text-sm whitespace-pre-line">{message.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 border-t">
                <div className="flex gap-1 mb-2">
                  {getQuickActions().map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.action)}
                      className="text-xs h-6 px-2"
                    >
                      <action.icon className="w-3 h-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Dashboard/Templates mode (full page integration)
  return (
    <Card className="h-full max-h-96">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">Video Editing Assistant</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.sender === "bot" && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {message.sender === "user" && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 border-t">
          <div className="flex gap-1 mb-2">
            {getQuickActions().map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.action)}
                className="text-xs h-6 px-2"
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about video editing..."
              className="flex-1"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
