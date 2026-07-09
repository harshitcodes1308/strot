import * as dns from "dns";
import * as net from "net";

export type ConfidenceScore = "high" | "medium" | "low" | "invalid";

export interface VerificationResult {
  email: string;
  confidence: ConfidenceScore;
  isCatchAll: boolean;
  reason?: string;
}

const resolveMx = (domain: string): Promise<dns.MxRecord[]> => {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) return reject(err);
      if (!addresses || addresses.length === 0) return reject(new Error("No MX records"));
      resolve(addresses.sort((a, b) => a.priority - b.priority));
    });
  });
};

const pingSmtp = async (email: string, mxHost: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    let step = 0;
    
    // Timeout after 5 seconds to avoid hanging on slow MX servers
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    const commands = [
      `HELO strot.app\r\n`,
      `MAIL FROM:<hello@strot.app>\r\n`,
      `RCPT TO:<${email}>\r\n`,
      `QUIT\r\n`
    ];

    socket.on("data", (data) => {
      const response = data.toString();
      
      // If we receive a 5xx error at any point, the email is likely invalid
      if (response.startsWith("5")) {
        clearTimeout(timeout);
        socket.destroy();
        resolve(false);
        return;
      }

      if (step < commands.length) {
        socket.write(commands[step]);
        
        // Step 2 is the RCPT TO command response
        if (step === 2) {
          if (response.startsWith("250")) {
            clearTimeout(timeout);
            socket.destroy();
            resolve(true); // Address exists
            return;
          } else {
            clearTimeout(timeout);
            socket.destroy();
            resolve(false);
            return;
          }
        }
        step++;
      }
    });

    socket.on("error", () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(false);
    });
  });
};

export async function verifyEmail(email: string): Promise<VerificationResult> {
  if (!email || !email.includes("@")) {
    return { email, confidence: "invalid", isCatchAll: false, reason: "Invalid format" };
  }

  const [_, domain] = email.split("@");
  
  try {
    const mxRecords = await resolveMx(domain);
    const primaryMx = mxRecords[0].exchange;

    // First check if it's a catch-all domain by testing a garbage email
    const catchAllTest = await pingSmtp(`this.definitely.does.not.exist.123987@${domain}`, primaryMx);
    
    if (catchAllTest) {
      // The domain accepts any email (Catch-all)
      return { 
        email, 
        confidence: "medium", 
        isCatchAll: true, 
        reason: "Domain is configured as catch-all. Email format seems valid but cannot be deterministically verified." 
      };
    }

    // Now test the actual email
    const actualTest = await pingSmtp(email, primaryMx);
    
    if (actualTest) {
      return { email, confidence: "high", isCatchAll: false, reason: "SMTP server confirmed address exists." };
    } else {
      return { email, confidence: "invalid", isCatchAll: false, reason: "SMTP server rejected address." };
    }

  } catch (error: any) {
    // If MX lookup fails or connection times out, we default to low confidence
    return { 
      email, 
      confidence: "low", 
      isCatchAll: false, 
      reason: error.message || "Failed to connect to mail server" 
    };
  }
}
