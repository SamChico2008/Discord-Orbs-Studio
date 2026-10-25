using System;
using System.Threading;

class Program {
    static void Main(string[] args) {
        int duration = 960;
        if (args.Length > 0) int.TryParse(args[0], out duration);
        Thread.Sleep(duration * 1000);
    }
}
