import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { supabase } from '../../../lib/supabase';

export default function ChatbotScreen() {
    const theme = useTheme();
    const router = useRouter();
    const C = {
        bg: theme.colors.background,
        surface: theme.colors.surfaceHighlight,
        border: theme.colors.border,
        primary: theme.colors.primary,
        primaryText: theme.colors.primary,
        text: theme.colors.textPrimary,
        textSub: theme.colors.textMuted,
        inputBg: theme.isDark ? '#13161D' : theme.colors.surfaceHighlight,
        btnText: theme.isDark ? '#041A0C' : '#FFFFFF',
        userMsgBg: theme.colors.primary,
        userMsgText: theme.isDark ? '#041A0C' : '#FFFFFF',
        botMsgBg: theme.colors.surfaceHighlight,
        botMsgText: theme.colors.textPrimary,
    };

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                
                const { data, error } = await supabase
                    .from('ts_ai_chat')
                    .select('id, role, message')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;

                if (data && data.length > 0) {
                    const formattedHistory = data.map(m => ({
                        id: m.id,
                        text: m.message,
                        sender: m.role === 'user' ? 'user' : 'bot'
                    }));
                    setMessages(formattedHistory);
                } else {
                    setMessages([
                        { id: '1', text: 'Halo! Saya AI asisten keuangan kamu di Taksly. Ada yang bisa saya bantu hari ini?', sender: 'bot' }
                    ]);
                }
            } catch (err) {
                console.error("Error loading chat history:", err);
                setMessages([
                    { id: '1', text: 'Halo! Saya AI asisten keuangan kamu di Taksly. Ada yang bisa saya bantu hari ini?', sender: 'bot' }
                ]);
            }
        };
        loadHistory();
    }, []);

    const handleSend = async () => {
        if (!inputText.trim() || loading) return;

        const userMessage = inputText.trim();

        const newMsg = {
            id: Date.now().toString(),
            text: userMessage,
            sender: 'user'
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke("ai-chat", {
                body: {
                    message: userMessage,
                },
            });

            if (error) throw error;

            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: data.reply,
                    sender: 'bot',
                },
            ]);
        } catch (err: any) {
            console.error(err);

            const errorMsg = err?.message || String(err);
            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: `Ups, gagal terhubung ke AI. (Error: ${errorMsg})`,
                    sender: "bot",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
            <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: C.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Taksly AI</Text>
                    <Text style={[styles.headerSub, { color: C.textSub }]}>Asisten Keuangan</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            <KeyboardAvoidingView 
                style={styles.container} 
                behavior="padding"
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((msg) => {
                        const isUser = msg.sender === 'user';
                        return (
                            <View 
                                key={msg.id} 
                                style={[
                                    styles.msgBubble, 
                                    isUser ? styles.msgBubbleUser : styles.msgBubbleBot,
                                    { backgroundColor: isUser ? C.userMsgBg : C.botMsgBg }
                                ]}
                            >
                                <Text style={[
                                    styles.msgText, 
                                    { color: isUser ? C.userMsgText : C.botMsgText }
                                ]}>
                                    {msg.text}
                                </Text>
                            </View>
                        );
                    })}
                    
                    {loading && (
                        <View style={[styles.msgBubble, styles.msgBubbleBot, { backgroundColor: C.botMsgBg, paddingVertical: 16 }]}>
                            <ActivityIndicator size="small" color={C.primary} />
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.inputContainer, { borderTopColor: C.border, backgroundColor: C.bg }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
                        placeholder={
                            loading
                                ? "Taksly AI sedang berpikir..."
                                : "Tanya soal pengeluaranmu..."
                        }
                        placeholderTextColor={C.textSub}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, { backgroundColor: C.primary, opacity: inputText.trim() && !loading ? 1 : 0.5 }]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || loading}
                    >
                        <Ionicons name="send" size={18} color={C.btnText} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 12,
        marginTop: 2,
    },
    headerRight: {
        width: 40,
    },
    scrollContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 20,
    },
    msgBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    msgBubbleUser: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    msgBubbleBot: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    msgText: {
        fontSize: 15,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        borderTopWidth: 1,
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
