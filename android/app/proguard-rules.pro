# HALDER - ProGuard & R8 Optimization Rules

# Capacitor Bridge and Plugin preservation
-keep public class com.getcapacitor.** { *; }
-keep public class com.getcapacitor.community.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }

# WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve native JNI methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve AndroidX and Material components
-keep class androidx.** { *; }
-dontwarn androidx.**

# Preserve Line Numbers for Crash Reporting
-keepattributes SourceFile,LineNumberTable
