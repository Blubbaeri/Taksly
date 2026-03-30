import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
    bg: "#08080E",
    surface: "#12121A",
    surfaceHigh: "#1C1C2E",
    border: "#2C2C3E",
    borderSoft: "#1C1C2E",
    primary: "#7C6FFF",
    primaryGlow: "rgba(124,111,255,0.08)",
    primaryBorder: "rgba(124,111,255,0.2)",
    primaryText: "#B8B2FF",
    text: "#FFFFFF",
    textSub: "#9494B0",
    textMid: "#5A5A78",
    muted: "#1E2336",
    success: "#4ADE80",
    successGlow: "rgba(74,222,128,0.08)",
    successBorder: "rgba(74,222,128,0.2)",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(24))[0];
    const iconScale = useState(new Animated.Value(0.8))[0];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    // Re-animate when email sent
    useEffect(() => {
        if (sent) {
            Animated.sequence([
                Animated.timing(iconScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
                Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
            ]).start();
        }
    }, [sent]);

    const handleSendReset = async () => {
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert("Email Required", "Please enter your email address.");
            return;
        }
        if (!trimmed.includes("@")) {
            Alert.alert("Invalid Email", "Please enter a valid email address.");
            return;
        }

        // URL web page yang di-host di GitHub Pages
        const redirectTo = "https://blubbaeri.github.io/Taksly/web/reset-password.html";

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
            redirectTo,
        });
        setLoading(false);

        if (error) {
            Alert.alert("Failed to Send", error.message);
        } else {
            setSent(true);
        }
    };

    return (
        <View style={styles.root}>
            {/* Glow orbs */}
            <View style={styles.orbTopRight} />
            <View style={styles.orbBottomLeft} />

            <KeyboardAvoidingView
                style={styles.kav}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={false}
                    bounces={false}
                >
                    <Animated.View
                        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                    >
                        {/* ── Back Button ── */}
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={20} color={C.textSub} />
                            <Text style={styles.backText}>Back to Login</Text>
                        </TouchableOpacity>

                        {/* ── Icon ── */}
                        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }, sent && styles.iconWrapSuccess]}>
                            <Ionicons
                                name={sent ? "checkmark-circle" : "mail-outline"}
                                size={32}
                                color={sent ? C.success : C.primary}
                            />
                        </Animated.View>

                        {/* ── Heading ── */}
                        <View style={styles.headingBlock}>
                            <Text style={styles.headingMain}>
                                {sent ? "Check your email" : "forgot password"}
                                <Text style={[styles.headingDot, sent && styles.headingDotSuccess]}>.</Text>
                            </Text>
                            <Text style={styles.headingSub}>
                                {sent
                                    ? `We've sent a password reset link to\n${email.trim()}`
                                    : "Enter the email you used to register and we'll send you a reset link."}
                            </Text>
                        </View>

                        {/* ── Input or Success State ── */}
                        {!sent ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <View style={[styles.fieldWrap, focused && styles.fieldWrapFocused]}>
                                        <Text style={[styles.fieldLabel, focused && styles.fieldLabelFocused]}>
                                            EMAIL ADDRESS
                                        </Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            placeholder="you@email.com"
                                            placeholderTextColor={C.textSub}
                                            value={email}
                                            onChangeText={setEmail}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setFocused(false)}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            autoComplete="email"
                                        />
                                        {focused && <View style={styles.activeLine} />}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
                                    activeOpacity={0.88}
                                    onPress={handleSendReset}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Text style={styles.ctaBtnText}>Sending…</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.ctaBtnText}>Send Reset Link</Text>
                                            <Ionicons name="send" size={15} color="#041A0C" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* ── Success Card ── */}
                                <View style={styles.successCard}>
                                    <View style={styles.successRow}>
                                        <Ionicons name="time-outline" size={16} color={C.success} />
                                        <Text style={styles.successHint}>Link expires in 1 hour</Text>
                                    </View>
                                    <View style={styles.successRow}>
                                        <Ionicons name="shield-checkmark-outline" size={16} color={C.success} />
                                        <Text style={styles.successHint}>Check your spam folder too</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.resendBtn}
                                    onPress={() => setSent(false)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.resendText}>Didn't receive it? Try again</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.ctaBtn}
                                    activeOpacity={0.88}
                                    onPress={() => router.replace("/(auth)/login")}
                                >
                                    <Text style={styles.ctaBtnText}>Back to Login</Text>
                                    <Ionicons name="arrow-forward" size={15} color="#041A0C" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Footer ── */}
                        <Text style={styles.footer}>© 2026 Taksly</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },

    orbTopRight: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        top: -120,
        right: -110,
        backgroundColor: "rgba(124,111,255,0.05)",
    },
    orbBottomLeft: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        bottom: -90,
        left: -90,
        backgroundColor: "rgba(74,222,128,0.03)",
    },

    kav: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingVertical: 48,
        paddingHorizontal: 26,
    },

    container: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },

    // Back
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 40,
        alignSelf: "flex-start",
    },
    backText: {
        color: C.textSub,
        fontSize: 13,
        fontWeight: "500",
    },

    // Icon
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: C.primaryGlow,
        borderWidth: 1,
        borderColor: C.primaryBorder,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
    },
    iconWrapSuccess: {
        backgroundColor: C.successGlow,
        borderColor: C.successBorder,
    },

    // Heading
    headingBlock: {
        marginBottom: 32,
    },
    headingMain: {
        color: C.text,
        fontSize: 36,
        fontWeight: "800",
        letterSpacing: -1.5,
        lineHeight: 42,
        marginBottom: 12,
    },
    headingDot: {
        color: C.primary,
    },
    headingDotSuccess: {
        color: C.success,
    },
    headingSub: {
        color: C.textMid,
        fontSize: 14,
        lineHeight: 22,
        fontWeight: "400",
    },

    // Input
    inputGroup: {
        marginBottom: 20,
    },
    fieldWrap: {
        backgroundColor: C.surfaceHigh,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 12,
        overflow: "hidden",
    },
    fieldWrapFocused: {
        borderColor: C.primaryBorder,
        backgroundColor: C.primaryGlow,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: C.textSub,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    fieldLabelFocused: {
        color: C.primaryText,
    },
    fieldInput: {
        color: C.text,
        fontSize: 15,
        fontWeight: "400",
        padding: 0,
        letterSpacing: 0.2,
    },
    activeLine: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: C.primary,
    },

    // CTA
    ctaBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: C.primary,
        borderRadius: 12,
        paddingVertical: 17,
        marginBottom: 16,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    ctaBtnLoading: { opacity: 0.6 },
    ctaBtnText: {
        color: "#041A0C",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.1,
    },

    // Success
    successCard: {
        backgroundColor: C.successGlow,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.successBorder,
        padding: 18,
        gap: 12,
        marginBottom: 24,
    },
    successRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    successHint: {
        color: C.success,
        fontSize: 13,
        fontWeight: "500",
    },

    resendBtn: {
        alignItems: "center",
        paddingVertical: 6,
        marginBottom: 16,
    },
    resendText: {
        color: C.primaryText,
        fontSize: 13,
        fontWeight: "600",
    },

    // Footer
    footer: {
        textAlign: "center",
        color: C.muted,
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.5,
        marginTop: 32,
    },
});
