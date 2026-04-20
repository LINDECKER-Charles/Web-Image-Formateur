import { Command } from 'commander';
import pc from 'picocolors';
import { registerConvert } from './commands/convert.js';
import { registerResize } from './commands/resize.js';
import { registerResConv } from './commands/res-conv.js';
import { registerConfig } from './commands/config.js';
import { runInteractive } from '../interactive/index.js';
import { ui } from '../ui/logger.js';
import { buildOptions } from './options.js';
import { resolveDefaults } from '../core/settings.js';

const NAME = 'img-convertor';
const VERSION = '1.0.0';

function buildProgram(): Command {
  const defaults = resolveDefaults();
  const options = buildOptions(defaults);

  const program = new Command()
    .name(NAME)
    .version(VERSION, '-v, --version', 'Print the version.')
    .description('Convert and resize images for the web — breakpoints, formats, quality control.')
    .showHelpAfterError()
    .configureHelp({ sortSubcommands: true, showGlobalOptions: true });

  program
    .command('interactive', { isDefault: false })
    .description('Open the interactive console.')
    .action(async () => {
      await runInteractive();
    });

  registerConvert(program, options);
  registerResize(program, options);
  registerResConv(program, options);
  registerConfig(program);

  program.addHelpText(
    'after',
    `
${pc.bold('Examples')}
  $ ${NAME} convert --input ./assets -r --format webp --quality 85
  $ ${NAME} resize --input ./hero.png --breakpoint 320,640,1024
  $ ${NAME} res-conv -r --format avif --breakpoint 480,960 --quality 70
  $ ${NAME} config set quality 80
  $ ${NAME} config set breakpoints 320,640,1024,1920
  $ ${NAME}                           ${pc.dim('# no args → interactive console')}
`,
  );

  return program;
}

export async function run(argv: string[]): Promise<void> {
  const program = buildProgram();

  // No subcommand → interactive console
  const subs = program.commands.map((c) => c.name());
  const hasCommand = argv.slice(2).some((a) => subs.includes(a));
  const asksHelp = argv.includes('--help') || argv.includes('-h');
  const asksVersion = argv.includes('--version') || argv.includes('-v');

  if (!hasCommand && !asksHelp && !asksVersion) {
    await runInteractive();
    return;
  }

  try {
    await program.parseAsync(argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ui.error(msg);
    process.exit(1);
  }
}
