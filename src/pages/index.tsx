import {useRouter} from 'next/router';
import {useEffect, useMemo, useState} from 'react';
import Markdown from 'react-markdown';
import {generateInstallInstructions, type ClientId, type ServerInput} from 'mcp-install-instructions';

const allClients: ClientId[] = [
	'chatgpt',
	'claude-ai',
	'claude-code',
	'cline',
	'codex',
	'crush',
	'cursor',
	'gemini-cli',
	'goose',
	'hermes',
	'librechat',
	'opencode',
	'openclaw',
	'roo-code',
	'vscode',
	'windsurf',
];

function parseConfig(query: Record<string, string | string[] | undefined>): ServerInput | null {
	if (typeof query.url === 'string') {
		const input: ServerInput & {transport?: 'http' | 'sse'} = {url: query.url};
		if (typeof query.name === 'string') {
			input.name = query.name;
		}

		if (query.transport === 'sse') {
			input.transport = 'sse';
		}

		return input;
	}

	if (typeof query.config === 'string') {
		try {
			// eslint-disable-next-line no-restricted-globals -- atob is the browser-compatible API
			return JSON.parse(atob(query.config)) as ServerInput;
		} catch {
			return null;
		}
	}

	return null;
}

function usePersistedClient(): [ClientId, (c: ClientId) => void] {
	const [client, setClient] = useState<ClientId>('claude-code');

	useEffect(() => {
		const saved = localStorage.getItem('mcp-install-client');
		if (saved && allClients.includes(saved as ClientId)) {
			setClient(saved as ClientId);
		}
	}, []);

	const persist = (c: ClientId) => {
		setClient(c);
		localStorage.setItem('mcp-install-client', c);
	};

	return [client, persist];
}

const CopyButton = ({text}: {text: string}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		void navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
			}, 2000);
		});
	};

	return (
		<button
			onClick={handleCopy}
			style={{
				padding: '3px 10px', fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
				background: 'var(--btn-bg)', color: 'var(--btn-fg)',
				border: 'none', borderRadius: 3, cursor: 'pointer',
				flexShrink: 0,
			}}
			onMouseOver={(e) => {
				e.currentTarget.style.background = 'var(--btn-hover)';
			}}
			onMouseOut={(e) => {
				e.currentTarget.style.background = 'var(--btn-bg)';
			}}
		>
			{copied ? 'copied' : 'copy'}
		</button>
	);
};

const MethodBlock = ({label, markdown, text}: {label: string; markdown: string; text: string}) => {
	return (
		<div style={{marginBottom: 24}}>
			<div style={{
				display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
			}}>
				<div style={sectionLabel}>{label}</div>
				<CopyButton text={text} />
			</div>
			<div style={{
				background: 'var(--block-bg)', border: '1px solid var(--block-border)',
				borderRadius: 4, padding: '14px 16px', overflowX: 'auto',
			}}>
				<div className='md-content'>
					<Markdown>{markdown}</Markdown>
				</div>
			</div>
		</div>
	);
};

const pageStyle = {maxWidth: 520, margin: '0 auto', padding: '48px 24px'} as const;
const sectionLabel = {
	fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--muted)', marginBottom: 10,
} as const;
const footerEl = (
	<footer style={{marginTop: 48, fontSize: 10, color: 'var(--footer)'}}>
		<a href='https://github.com/domdomegg/install-mcp' style={{color: 'var(--footer)', textDecoration: 'none'}}>install-mcp</a>
	</footer>
);

const ExampleLink = ({href, code, description}: {href: string; code: string; description: string}) => {
	return (
		<a href={href} style={{
			display: 'block', padding: '10px 14px',
			background: 'var(--block-bg)', border: '1px solid var(--block-border)',
			borderRadius: 4, color: 'var(--fg)', textDecoration: 'none',
		}}>
			<code style={{fontSize: 12}}>{code}</code>
			<span style={{
				display: 'block', fontSize: 11, color: 'var(--subtle)', marginTop: 2,
			}}>{description}</span>
		</a>
	);
};

const NoConfigPage = () => {
	return (
		<div style={pageStyle}>
			<h1 style={{
				fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, color: 'var(--muted)', marginBottom: 8,
			}}>
				Install MCP Server
			</h1>
			<p style={{fontSize: 13, color: 'var(--subtle)', marginBottom: 28}}>
				Generate install instructions for any MCP server across all common clients.
			</p>

			<div style={{...sectionLabel, marginBottom: 10}}>Try it</div>
			<div style={{
				display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32,
			}}>
				<ExampleLink href='?url=https://mcp.example.com/mcp' code='?url=https://mcp.example.com/mcp' description='Remote HTTP server' />
				<ExampleLink href='?url=https://mcp.example.com/sse&transport=sse' code='?url=https://...&transport=sse' description='Remote SSE server' />
			</div>

			<div style={{...sectionLabel, marginBottom: 10}}>URL format</div>
			<div style={{
				fontSize: 12, color: 'var(--subtle)', marginBottom: 32, lineHeight: 1.8,
			}}>
				<code style={{color: 'var(--fg)'}}>?url=</code> &mdash; server URL (required)<br />
				<code style={{color: 'var(--fg)'}}>?transport=</code> &mdash; <code>http</code> (default) or <code>sse</code><br />
				<code style={{color: 'var(--fg)'}}>?name=</code> &mdash; server name (auto-derived if omitted)
			</div>

			{footerEl}
		</div>
	);
};

const Home = () => {
	const router = useRouter();
	const [selectedClient, setSelectedClient] = usePersistedClient();

	const server = useMemo(() => {
		if (!router.isReady) {
			return null;
		}

		return parseConfig(router.query);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.isReady, router.asPath]);

	const result = useMemo(() => {
		if (!server) {
			return null;
		}

		return generateInstallInstructions(selectedClient, server);
	}, [server, selectedClient]);

	if (!server) {
		return <NoConfigPage />;
	}

	return (
		<div style={pageStyle}>
			<h1 style={{
				fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, color: 'var(--muted)', marginBottom: 20,
			}}>
				Install MCP Server
			</h1>

			<label htmlFor='client-select' style={{
				display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4,
			}}>
				Client
			</label>
			<select
				id='client-select'
				value={selectedClient}
				onChange={(e) => {
					setSelectedClient(e.target.value as ClientId);
				}}
				style={{
					font: 'inherit', fontSize: 13, width: '100%',
					padding: '8px 30px 8px 10px', marginBottom: 24,
					border: '1px solid var(--input-border)', borderRadius: 4,
					background: 'var(--input-bg)', color: 'var(--fg)',
					appearance: 'none', WebkitAppearance: 'none',
					backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath fill=\'%23777\' d=\'M0 0l5 6 5-6z\'/%3E%3C/svg%3E")',
					backgroundRepeat: 'no-repeat',
					backgroundPosition: 'right 10px center',
				}}
				onFocus={(e) => {
					e.currentTarget.style.borderColor = 'var(--input-focus)';
				}}
				onBlur={(e) => {
					e.currentTarget.style.borderColor = 'var(--input-border)';
				}}
			>
				{allClients.map((id) => {
					const r = generateInstallInstructions(id, server);
					return (
						<option key={id} value={id} disabled={r.methods.length === 0}>
							{r.name}{r.methods.length === 0 ? ' (not supported)' : ''}
						</option>
					);
				})}
			</select>

			{result && result.methods.length > 0
				? (
					<>
						<MethodBlock label={result.methods[0].label} markdown={result.methods[0].markdown} text={result.methods[0].text} />
						{result.methods.length > 1 && (
							<details style={{marginTop: 8}}>
								<summary style={{
									fontSize: 11, color: 'var(--subtle)', cursor: 'pointer',
									marginBottom: 16, userSelect: 'none',
								}}>
									{result.methods.length - 1} other method{result.methods.length > 2 ? 's' : ''}
								</summary>
								{result.methods.slice(1).map((method) => (
									<MethodBlock key={method.label} label={method.label} markdown={method.markdown} text={method.text} />
								))}
							</details>
						)}
					</>
				)
				: (
					<p style={{fontSize: 13, color: 'var(--subtle)'}}>
						This client does not support this server type.
					</p>
				)}

			{footerEl}
		</div>
	);
};

export default Home;
