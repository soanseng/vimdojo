interface PluginSimulatorProps {
  plugin: string
  scenario: string
  isActive: boolean
}

function TelescopeMock() {
  return (
    <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg overflow-hidden shadow-2xl max-w-lg mx-auto">
      <div className="bg-ctp-surface0 px-3 py-1.5 text-xs text-ctp-subtext0 border-b border-ctp-surface1 flex justify-between">
        <span>Telescope</span>
        <span className="text-ctp-overlay0">Files</span>
      </div>
      <div className="px-3 py-2 border-b border-ctp-surface1">
        <div className="flex items-center gap-2">
          <span className="text-ctp-blue text-sm">&#10095;</span>
          <span className="text-sm text-ctp-subtext0 animate-pulse">|</span>
        </div>
      </div>
      <div className="py-1">
        <div className="px-3 py-1 bg-ctp-surface0 text-sm text-ctp-blue font-mono">src/main.tsx</div>
        <div className="px-3 py-1 text-sm text-ctp-text font-mono">src/App.tsx</div>
        <div className="px-3 py-1 text-sm text-ctp-text font-mono">src/engine/vim-engine.ts</div>
        <div className="px-3 py-1 text-sm text-ctp-text font-mono">src/components/VimEditor.tsx</div>
        <div className="px-3 py-1 text-sm text-ctp-text font-mono">package.json</div>
      </div>
      <div className="px-3 py-1 bg-ctp-surface0 text-xs text-ctp-overlay0 border-t border-ctp-surface1">
        5 / 42 results
      </div>
    </div>
  )
}

function NeoTreeMock() {
  return (
    <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg overflow-hidden w-64">
      <div className="bg-ctp-surface0 px-3 py-1.5 text-xs text-ctp-subtext0 border-b border-ctp-surface1">
        Neo-tree &#8212; &#27284;&#26696;&#31649;&#29702;&#22120;
      </div>
      <div className="py-1 font-mono text-sm">
        <div className="px-3 py-0.5 text-ctp-blue">&#9660; src/</div>
        <div className="px-6 py-0.5 text-ctp-text">  App.tsx</div>
        <div className="px-6 py-0.5 text-ctp-green bg-ctp-surface0">  main.tsx &#8592;</div>
        <div className="px-6 py-0.5 text-ctp-blue">&#9660; engine/</div>
        <div className="px-9 py-0.5 text-ctp-text">  vim-engine.ts</div>
        <div className="px-3 py-0.5 text-ctp-yellow">&#9654; public/</div>
        <div className="px-3 py-0.5 text-ctp-text">  package.json</div>
      </div>
      <div className="px-3 py-1 bg-ctp-surface0 text-xs text-ctp-overlay0 border-t border-ctp-surface1">
        &#25353; ? &#39023;&#31034;&#24555;&#25463;&#37749;
      </div>
    </div>
  )
}

function HarpoonMock() {
  return (
    <div className="bg-ctp-mantle border border-ctp-blue/50 rounded-lg overflow-hidden max-w-sm mx-auto shadow-2xl">
      <div className="bg-ctp-surface0 px-3 py-1.5 text-xs text-ctp-blue border-b border-ctp-surface1">
        Harpoon &#8212; &#24555;&#36895;&#20999;&#25563;
      </div>
      <div className="py-1 font-mono text-sm">
        <div className="px-3 py-1 text-ctp-green">1. src/main.tsx</div>
        <div className="px-3 py-1 bg-ctp-surface0 text-ctp-blue">2. src/App.tsx &#8592;</div>
        <div className="px-3 py-1 text-ctp-text">3. README.md</div>
        <div className="px-3 py-1 text-ctp-overlay0 italic">4. (empty)</div>
      </div>
    </div>
  )
}

function GitsignsMock() {
  return (
    <div className="bg-ctp-base border border-ctp-surface1 rounded-lg overflow-hidden font-mono text-sm max-w-lg mx-auto">
      <div className="flex">
        <div className="w-2 bg-ctp-surface0"></div>
        <div className="flex-1 px-3 py-0.5 text-ctp-text">{'function hello() {'}</div>
      </div>
      <div className="flex">
        <div className="w-2 bg-ctp-green"></div>
        <div className="flex-1 px-3 py-0.5 text-ctp-green bg-ctp-green/10">+  console.log(&quot;added&quot;)</div>
      </div>
      <div className="flex">
        <div className="w-2 bg-ctp-red"></div>
        <div className="flex-1 px-3 py-0.5 text-ctp-red bg-ctp-red/10 line-through">-  console.log(&quot;old&quot;)</div>
      </div>
      <div className="flex">
        <div className="w-2 bg-ctp-yellow"></div>
        <div className="flex-1 px-3 py-0.5 text-ctp-yellow bg-ctp-yellow/10">~  return modified</div>
      </div>
      <div className="flex">
        <div className="w-2 bg-ctp-surface0"></div>
        <div className="flex-1 px-3 py-0.5 text-ctp-text">{'}'}</div>
      </div>
    </div>
  )
}

function ObsidianMock() {
  return (
    <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg overflow-hidden max-w-lg mx-auto">
      <div className="bg-ctp-surface0 px-3 py-1.5 text-xs text-ctp-subtext0 border-b border-ctp-surface1">
        Daily Note &#8212; 2026-03-26
      </div>
      <div className="p-4 text-sm space-y-2">
        <div className="text-ctp-text"># &#20170;&#26085;&#31558;&#35352;</div>
        <div className="text-ctp-text">- &#23436;&#25104; <span className="text-ctp-blue underline">[[&#23560;&#26696;&#35373;&#35336;]]</span> &#30340;&#20462;&#25913;</div>
        <div className="text-ctp-text">- &#22238;&#39015; <span className="text-ctp-blue underline">[[&#26371;&#35696;&#35352;&#37636;]]</span></div>
        <div className="text-ctp-text">- <span className="text-ctp-yellow">#todo</span> &#26356;&#26032;&#25991;&#20214;</div>
        <div className="text-ctp-text">- <span className="text-ctp-green">- [x]</span> &#37096;&#32626;&#23436;&#25104;</div>
      </div>
    </div>
  )
}

function TroubleMock() {
  return (
    <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg overflow-hidden max-w-lg mx-auto">
      <div className="bg-ctp-surface0 px-3 py-1.5 text-xs border-b border-ctp-surface1 flex justify-between">
        <span className="text-ctp-red">Trouble &#8212; Diagnostics</span>
        <span className="text-ctp-overlay0">3 errors, 2 warnings</span>
      </div>
      <div className="py-1 font-mono text-xs">
        <div className="px-3 py-1 text-ctp-red">&#10005; src/main.tsx:12 &#8212; Cannot find module &apos;./App&apos;</div>
        <div className="px-3 py-1 text-ctp-red">&#10005; src/engine.ts:45 &#8212; Type error: string not assignable</div>
        <div className="px-3 py-1 text-ctp-red bg-ctp-surface0">&#10005; src/utils.ts:3 &#8212; Unused variable &apos;temp&apos; &#8592;</div>
        <div className="px-3 py-1 text-ctp-yellow">&#9888; src/App.tsx:8 &#8212; Missing return type</div>
        <div className="px-3 py-1 text-ctp-yellow">&#9888; package.json:5 &#8212; Deprecated dependency</div>
      </div>
    </div>
  )
}

function BlinkCmpMock() {
  return (
    <div className="relative bg-ctp-base border border-ctp-surface1 rounded-lg overflow-hidden max-w-lg mx-auto font-mono text-sm">
      <div className="p-3 text-ctp-text">
        const result = arr.fi<span className="border-l-2 border-ctp-green animate-pulse"> </span>
      </div>
      <div className="absolute left-24 top-8 bg-ctp-mantle border border-ctp-surface1 rounded shadow-xl z-10 w-48">
        <div className="px-2 py-1 bg-ctp-surface0 text-ctp-blue">filter</div>
        <div className="px-2 py-1 text-ctp-text">find</div>
        <div className="px-2 py-1 text-ctp-text">findIndex</div>
        <div className="px-2 py-1 text-ctp-text">fill</div>
        <div className="px-2 py-1 text-ctp-text">flat</div>
      </div>
    </div>
  )
}

function FlashMock() {
  return (
    <div className="bg-ctp-base border border-ctp-surface1 rounded-lg overflow-hidden max-w-lg mx-auto font-mono text-sm p-3">
      <div className="text-ctp-text">
        function <span className="bg-ctp-red text-ctp-base px-0.5 rounded font-bold">a</span>ello() {'{'}{' '}
      </div>
      <div className="text-ctp-text">
        &nbsp; const <span className="bg-ctp-red text-ctp-base px-0.5 rounded font-bold">b</span>ata = getValue()
      </div>
      <div className="text-ctp-text">
        &nbsp; return <span className="bg-ctp-red text-ctp-base px-0.5 rounded font-bold">c</span>ata.map(x =&gt; x)
      </div>
      <div className="text-ctp-text">{'}'}</div>
      <div className="mt-2 text-xs text-ctp-overlay0">&#25353;&#27161;&#31844;&#23383;&#27597;&#36339;&#36681; (s &#36914;&#20837; seek &#27169;&#24335;)</div>
    </div>
  )
}

function GenericMock({ scenario }: { scenario: string }) {
  return (
    <div className="bg-ctp-crust border border-ctp-surface1 rounded-lg p-4 font-mono text-sm max-w-lg mx-auto">
      <div className="text-ctp-green">&#10095; nvim .</div>
      <div className="text-ctp-subtext0 mt-1">{scenario}</div>
    </div>
  )
}

const PLUGIN_MOCKS: Record<string, React.FC> = {
  telescope: TelescopeMock,
  'neo-tree': NeoTreeMock,
  harpoon: HarpoonMock,
  gitsigns: GitsignsMock,
  obsidian: ObsidianMock,
  trouble: TroubleMock,
  'blink-cmp': BlinkCmpMock,
  flash: FlashMock,
}

export default function PluginSimulator({ plugin, scenario, isActive }: PluginSimulatorProps) {
  const MockComponent = PLUGIN_MOCKS[plugin]

  return (
    <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      {MockComponent ? <MockComponent /> : <GenericMock scenario={scenario} />}
    </div>
  )
}
