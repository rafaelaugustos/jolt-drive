interface Disposable {
	dispose(): void;
}

// Native property owners must survive backgrounding; only their bindings pause.
export function createDisposables() {
	const resources: Disposable[] = [];
	return {
		add<T extends Disposable>(resource: T): T {
			resources.push(resource);
			return resource;
		},
		dispose() {
			const errors: unknown[] = [];
			for (const resource of resources.splice(0).reverse()) {
				try {
					resource.dispose();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length) throw new AggregateError(errors, 'Could not release native resources');
		},
	};
}
