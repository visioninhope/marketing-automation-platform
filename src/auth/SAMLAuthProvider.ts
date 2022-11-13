import { Profile, SAML } from '@node-saml/node-saml'
import { SignatureAlgorithm } from '@node-saml/node-saml/lib/types'
import { Context } from 'koa'
import { URL } from 'url'
import { RequestError } from '../core/errors'
import { AuthTypeConfig } from './Auth'
import AuthProvider from './AuthProvider'
import AuthError from './AuthError'

export interface SAMLConfig extends AuthTypeConfig {
    driver: 'saml'
    callbackUrl: string // our url?
    entryPoint: string // SSO url?
    issuer: string
    cert: string
    identifierFormat?: string
    signatureAlgorithm?: SignatureAlgorithm
    digestAlgorithm?: SignatureAlgorithm
    wantAuthnResponseSigned?: boolean
}

// {
//     issuer: 'https://accounts.google.com/o/saml2?idpid=C04a7bn68',
//     sessionIndex: '_c6cf1198b7b67a9a4f8500f1ae22b79c',
//     nameID: 'canderson@twochris.com',
//     nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
//     nameQualifier: undefined,
//     spNameQualifier: undefined,
//     firstName: 'Chris',
//     lastName: 'Anderson',
//     attributes: { firstName: 'Chris', lastName: 'Anderson' },
//     getAssertionXml: [Function (anonymous)],
//     getAssertion: [Function (anonymous)],
//     getSamlResponseXml: [Function (anonymous)]
//   },

interface SAMLProfile extends Profile {
    first_name?: string
    last_name?: string
}

interface SAMLResponse {
    profile: Profile | null
    loggedOut: boolean
}

interface ValidatedSAMLResponse extends SAMLResponse {
    profile: SAMLProfile | null
}

export default class SAMLAuthProvider extends AuthProvider {

    saml: SAML
    constructor(config: SAMLConfig) {
        super()
        this.saml = new SAML(config)
    }

    async start(ctx: Context) {
        const host = ctx.request.headers?.host
        const relayState = ctx.request.query?.RelayState || ctx.request.body.RelayState

        const url = await this.saml.getAuthorizeUrlAsync(relayState, host, {})

        ctx.redirect(url)
    }

    async validate(ctx: Context) {
        const response = await this.parseValidation(ctx)
        if (!response) throw new RequestError(AuthError.SAMLValidationError)

        // If there is no profile we take no action
        if (!response.profile) return
        if (response.loggedOut) {
            await this.logout({ email: response.profile.nameID }, ctx)
            return
        }

        // If we are logging in, grab profile and create tokens
        const { first_name, last_name, nameID: email } = response.profile
        await this.login({ first_name, last_name, email }, ctx)
    }

    private async parseValidation(ctx: Context): Promise<ValidatedSAMLResponse | undefined> {
        const { query, body, href } = ctx.request
        if (query?.SAMLResponse || query?.SAMLRequest) {
            const originalQuery = new URL(href).href
            return await this.saml.validateRedirectAsync(query, originalQuery)
        } else if (body?.SAMLResponse) {
            return await this.saml.validatePostResponseAsync(body)
        } else if (body?.SAMLRequest) {
            return await this.saml.validatePostRequestAsync(body)
        }
    }
}