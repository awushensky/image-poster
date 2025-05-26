export interface DatabaseModule {
  name: string;
  dependencies: string[];
  initSQL: string;
}

export function topologicalSort(modules: DatabaseModule[]): DatabaseModule[] {
  const sorted: DatabaseModule[] = [];
  const visited: Set<string> = new Set();
  const visiting: Set<string> = new Set();

  function visit(moduleName: string) {
    if (visiting.has(moduleName)) {
      throw new Error(`Circular dependency detected involving ${moduleName}`);
    }
    if (visited.has(moduleName)) return;

    const module = modules.find(m => m.name === moduleName);
    if (!module) {
      throw new Error(`Database module ${moduleName} not found. Available modules: ${modules.map(m => m.name).join(', ')}`);
    }

    visiting.add(moduleName);
    
    for (const dep of module.dependencies) {
      visit(dep);
    }
    
    visiting.delete(moduleName);
    visited.add(moduleName);
    sorted.push(module);
  }

  for (const module of modules) {
    visit(module.name);
  }

  return sorted;
}