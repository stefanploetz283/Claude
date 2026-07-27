using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading;

class Launcher
{
    static Process server;
    static Process s3;
    static string projectDir = @"C:\Users\User 1\Desktop\pros verwaltung (claude)";
    static string url = "http://localhost:3000";
    static string s3Url = "http://localhost:4569";
    static string logPath = @"C:\Users\User 1\Desktop\pros verwaltung (claude)\launcher\launcher.log";

    static void Log(string msg)
    {
        try { File.AppendAllText(logPath, DateTime.Now + " " + msg + Environment.NewLine); } catch { }
    }

    delegate bool HandlerRoutine(int dwCtrlType);
    [DllImport("kernel32.dll")]
    static extern bool SetConsoleCtrlHandler(HandlerRoutine handler, bool add);
    static HandlerRoutine handlerRef;

    static void Main()
    {
        try { RunMain(); }
        catch (Exception ex) { Log("FATAL: " + ex); }
    }

    static void RunMain()
    {
        Log("=== Start ===");
        Console.Title = "Fallverwaltung";
        handlerRef = new HandlerRoutine(ConsoleCtrlHandler);
        SetConsoleCtrlHandler(handlerRef, true);
        Log("Console handler registered");

        Console.WriteLine("Fallverwaltung wird gestartet ...");
        Console.WriteLine("Dieses Fenster bitte offen lassen, solange Sie die App nutzen.");
        Console.WriteLine();

        Log("Ensuring local file storage (s3rver)");
        EnsureS3rver();

        Log("Checking if server already up");
        if (IsUp(url))
        {
            Log("Server already up");
            Console.WriteLine("Server läuft bereits. Öffne Browser ...");
            OpenBrowser();
            Console.WriteLine();
            Console.WriteLine("Dieses Fenster kann geschlossen werden; der Server läuft eigenständig weiter.");
            Console.WriteLine("Taste drücken zum Beenden dieses Fensters ...");
            Console.ReadKey();
            return;
        }

        Log("Ensuring postgres");
        EnsurePostgres();
        Log("Starting server process");
        StartServer();
        Log("Server process started, pid=" + (server != null ? server.Id.ToString() : "null"));

        Console.WriteLine("Warte auf Serverstart ...");
        bool ready = WaitForServer(60);
        Log("WaitForServer result: " + ready);

        if (ready)
        {
            Console.WriteLine("Server bereit. Öffne Browser ...");
            OpenBrowser();
        }
        else
        {
            Console.WriteLine("Der Server konnte nicht rechtzeitig gestartet werden.");
            Console.WriteLine("Bitte die Meldungen oben prüfen oder erneut versuchen.");
        }

        Console.WriteLine();
        Console.WriteLine("Zum Beenden dieses Fenster schließen (stoppt auch den Server).");
        if (server != null && !server.HasExited)
            server.WaitForExit();
        Log("=== End ===");
    }

    static void EnsurePostgres()
    {
        try
        {
            var p = new Process();
            p.StartInfo.FileName = "net";
            p.StartInfo.Arguments = "start postgresql-x64-16";
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.CreateNoWindow = true;
            p.StartInfo.RedirectStandardOutput = true;
            p.StartInfo.RedirectStandardError = true;
            p.Start();
            p.WaitForExit(15000);
        }
        catch (Exception ex) { Log("EnsurePostgres error: " + ex); }
    }

    static void StartServer()
    {
        var psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm start",
            WorkingDirectory = projectDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        psi.EnvironmentVariables["PATH"] = @"C:\Program Files\nodejs;" + psi.EnvironmentVariables["PATH"];

        server = new Process { StartInfo = psi };
        server.OutputDataReceived += (s, e) => { if (e.Data != null) { Console.WriteLine(e.Data); Log("OUT: " + e.Data); } };
        server.ErrorDataReceived += (s, e) => { if (e.Data != null) { Console.WriteLine(e.Data); Log("ERR: " + e.Data); } };
        server.Start();
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
    }

    static bool IsUp(string checkUrl)
    {
        try
        {
            var handler = new HttpClientHandler { UseProxy = false };
            using (var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(2) })
            {
                var resp = client.GetAsync(checkUrl).GetAwaiter().GetResult();
                return true;
            }
        }
        catch { return false; }
    }

    static bool WaitForServer(int maxSeconds)
    {
        for (int i = 0; i < maxSeconds; i++)
        {
            if (server != null && server.HasExited) return false;
            if (IsUp(url)) return true;
            Thread.Sleep(1000);
        }
        return false;
    }

    static void EnsureS3rver()
    {
        try
        {
            if (IsUp(s3Url)) { Log("s3rver already up"); return; }

            var psi = new ProcessStartInfo
            {
                FileName = @"C:\Program Files\nodejs\node.exe",
                Arguments = "\"node_modules\\s3rver\\bin\\s3rver.js\" --port 4569 --directory .s3rver-data --address 127.0.0.1",
                WorkingDirectory = projectDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            s3 = new Process { StartInfo = psi };
            s3.OutputDataReceived += (s, e) => { if (e.Data != null) Log("S3-OUT: " + e.Data); };
            s3.ErrorDataReceived += (s, e) => { if (e.Data != null) Log("S3-ERR: " + e.Data); };
            s3.Start();
            s3.BeginOutputReadLine();
            s3.BeginErrorReadLine();

            for (int i = 0; i < 15; i++)
            {
                if (IsUp(s3Url)) { Log("s3rver ready"); return; }
                Thread.Sleep(1000);
            }
            Log("s3rver did not respond in time");
        }
        catch (Exception ex) { Log("EnsureS3rver error: " + ex); }
    }

    static void OpenBrowser()
    {
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }

    static bool ConsoleCtrlHandler(int ctrlType)
    {
        try
        {
            if (server != null && !server.HasExited) KillTree(server.Id);
            if (s3 != null && !s3.HasExited) KillTree(s3.Id);
        }
        catch { }
        return false;
    }

    static void KillTree(int pid)
    {
        try
        {
            var kill = new Process();
            kill.StartInfo.FileName = "taskkill";
            kill.StartInfo.Arguments = "/F /T /PID " + pid;
            kill.StartInfo.UseShellExecute = false;
            kill.StartInfo.CreateNoWindow = true;
            kill.Start();
            kill.WaitForExit(5000);
        }
        catch { }
    }
}
