import { Resend } from "resend"
import config from "./env.config";
import { logger } from "@repo/logger";

const resend  = new Resend(config.emailKey);

export const sendVerificationEmail = async ( email : string , verificationCode : string ) => {
    const { data , error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Verify your email",
        html: `<p>Your verification code is: ${verificationCode}</p>`
    });

    if (error) {   
        logger.error(`Failed to send verification email to ${email}: ${error.message}`);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }

    logger.info(`Verification email sent to ${email}`);
    return data;
}

export const sendPasswordResetEmail = async (
    email: string,
    resetCode: string,
) => {
    const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Reset your password",
        html: `<p>Your password reset code is: ${resetCode}</p>`
    });

    if (error) {
        logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    logger.info(`Password reset email sent to ${email}`);
    return data;
}
