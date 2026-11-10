// TODOS los textos de ayuda del panel están aquí, en español sencillo.
// Para corregir una frase basta con cambiarla en este archivo; no hace falta tocar los componentes.

export type Rol = 'admin' | 'bodega' | 'ventas';
export type Seccion = 'inicio' | 'productos' | 'inventario' | 'importar' | 'cotizaciones' | 'imagenes' | 'usuarios' | 'ajustes';

export interface TextoAyuda {
  titulo: string;
  pasos: string[];
}

// ---------------------------------------------------------------------------------------------
// Cuadro "¿Cómo funciona esta pantalla?" (3 o 4 pasos). "porRol" reemplaza los pasos para ese rol.
// ---------------------------------------------------------------------------------------------
export const AYUDA_SECCION: Record<Seccion, TextoAyuda & { porRol?: Partial<Record<Rol, TextoAyuda>> }> = {
  inicio: {
    titulo: '¿Cómo funciona el panel?',
    pasos: [
      'Siga los "Primeros pasos" hasta que la web quede lista para vender.',
      'Revise cada día los avisos: pedidos nuevos, stock bajo y productos que no se ven en la web.',
      'Use el menú para ir a cada sección. En cada pantalla encontrará el botón "Ayuda".'
    ],
    porRol: {
      bodega: {
        titulo: 'Su trabajo en el panel',
        pasos: [
          'Cuando entre o salga mercancía, regístrela en Inventario con "Registrar movimiento".',
          'Si cuenta la bodega y el número no cuadra, use "Ajuste" y escriba lo que contó.',
          'Revise "Stock bajo el mínimo" para saber qué hay que producir.'
        ]
      },
      ventas: {
        titulo: 'Su trabajo en el panel',
        pasos: [
          'Los pedidos y solicitudes del sitio llegan a "Cotizaciones y pedidos".',
          'Escriba al cliente por WhatsApp con el botón verde de cada pedido.',
          'Cuando el cliente confirme, use "Confirmar": así se aparta la mercancía.',
          'Cuando salga el despacho, use "Marcar despachado": así se descuenta del stock.'
        ]
      }
    }
  },
  productos: {
    titulo: '¿Cómo funciona esta pantalla?',
    pasos: [
      'Aquí está todo el catálogo. Use el buscador o los filtros para encontrar una referencia.',
      'Un producto se publica en la web solo cuando tiene tipo, precio y al menos una foto.',
      'Si dice "Borrador", el aviso naranja le dice qué falta. Toque el enlace para completarlo.',
      'Con "Nuevo producto" crea uno; con el lápiz lo edita.'
    ],
    porRol: {
      bodega: { titulo: '¿Cómo funciona esta pantalla?', pasos: ['Aquí puede consultar el catálogo y la ficha de cada producto.', 'Para cambiar el stock vaya a Inventario: los productos solo los edita un administrador.'] },
      ventas: { titulo: '¿Cómo funciona esta pantalla?', pasos: ['Aquí puede consultar precios, equivalencias y la ficha de cada producto.', 'Use "Exportar catálogo PDF" para enviar el catálogo a un cliente.'] }
    }
  },
  inventario: {
    titulo: '¿Cómo funciona el inventario?',
    pasos: [
      'El stock no se escribe a mano: sale de los movimientos (entradas, salidas y ajustes).',
      'Para registrar uno, elija Entrada, Salida o Ajuste, busque la referencia y escriba la cantidad.',
      '"Ajuste" es para cuando cuenta la bodega: escriba lo que contó y el sistema registra la diferencia.',
      'Lo reservado son unidades apartadas por pedidos confirmados que aún no se despachan.'
    ],
    porRol: {
      ventas: { titulo: '¿Cómo funciona el inventario?', pasos: ['Aquí ve cuánto hay de cada referencia y cuánto está apartado por pedidos.', 'Los movimientos los registra bodega o un administrador.'] }
    }
  },
  importar: {
    titulo: '¿Cómo funciona la importación?',
    pasos: [
      'Suba el Excel con su lista de productos y elija la hoja donde están los datos.',
      'Indique qué columna corresponde a cada dato (referencia, precio, medidas…).',
      'Revise el resumen: verá qué se crea, qué se actualiza y qué filas tienen errores.',
      'Confirme. Nada cambia hasta que usted confirme.'
    ]
  },
  cotizaciones: {
    titulo: '¿Cómo funcionan las cotizaciones?',
    pasos: [
      'Aquí llega lo que los clientes envían desde la web: pedidos, fabricación a medida y recordatorios.',
      'Escriba al cliente con el botón de WhatsApp de cada solicitud.',
      '"Confirmar" aparta la mercancía; "Marcar despachado" la descuenta del stock.',
      'Si el cliente desiste, use "Cancelar": lo apartado vuelve a quedar disponible.'
    ],
    porRol: {
      bodega: { titulo: '¿Cómo funcionan las cotizaciones?', pasos: ['Aquí puede ver qué pedidos están confirmados para preparar los despachos.', 'Los estados los cambia ventas o un administrador.'] }
    }
  },
  imagenes: {
    titulo: '¿Cómo funciona la biblioteca de imágenes?',
    pasos: [
      'Suba aquí las fotos de los productos (JPG, PNG o WEBP).',
      'Póngales un nombre fácil de reconocer, por ejemplo la referencia.',
      'Luego, en Productos, abra el producto y use "Agregar desde la biblioteca".'
    ]
  },
  usuarios: {
    titulo: '¿Cómo funcionan los usuarios?',
    pasos: [
      'Cree una cuenta para cada persona; no compartan la misma contraseña.',
      'Administrador: todo. Bodega: inventario. Ventas: cotizaciones y pedidos.',
      'Si alguien olvida la contraseña, use "Restablecer contraseña" y entréguele la nueva.',
      'Si alguien deja la empresa, desactive su cuenta en lugar de borrarla.'
    ]
  },
  ajustes: {
    titulo: '¿Cómo funcionan los ajustes?',
    pasos: [
      'Son los datos del negocio que aparecen en la web: WhatsApp, correo, tiempos y políticas.',
      'El WhatsApp de ventas es obligatorio: sin él la web no puede recibir pedidos.',
      'Si deja un dato vacío, la web oculta esa línea; nunca muestra un dato inventado.'
    ]
  }
};

// ---------------------------------------------------------------------------------------------
// Ícono "?" junto a campos técnicos o que se prestan a confusión
// ---------------------------------------------------------------------------------------------
export const AYUDA_CAMPO = {
  alto: 'Altura total del filtro, de tapa a tapa, en milímetros.',
  alturaPliegue: 'Profundidad de cada pliegue del papel, en milímetros. Se mide del borde interno al externo.',
  cortePapel: 'Ancho del papel antes de plisarlo, en milímetros. Es la medida con la que se corta el rollo.',
  stockMinimo: 'Cantidad por debajo de la cual hay que producir más. Cuando el disponible baja de este número, el producto aparece en "Stock bajo" y la web muestra "Últimas unidades".',
  reservado: 'Unidades apartadas por pedidos confirmados que todavía no se despachan. No se pueden vender a otro cliente.',
  disponible: 'Lo que se puede vender hoy: el stock menos lo reservado.',
  precioVolumen: 'Precio por unidad cuando el cliente compra muchas. Ejemplo: "Desde 10 unidades, $90.000 c/u". La web lo aplica sola según la cantidad.',
  publicado: 'Publicado: se ve en la web y en el catálogo PDF. Borrador: no se ve, porque le falta algo (tipo, precio o foto) o porque usted lo ocultó.',
  codigoSiigo: 'El código con el que este producto está creado en Siigo. Sirve para conectar las ventas cuando se active la sincronización.'
} as const;
export type CampoAyuda = keyof typeof AYUDA_CAMPO;

// ---------------------------------------------------------------------------------------------
// Primeros pasos del inicio (solo administrador)
// ---------------------------------------------------------------------------------------------
export const PRIMEROS_PASOS: Record<string, { titulo: string; detalle: string; enlace: string; accion: string }> = {
  whatsapp: { titulo: 'Escriba el WhatsApp de ventas', detalle: 'Sin él, la web no puede recibir pedidos.', enlace: '/admin/ajustes', accion: 'Ir a Ajustes' },
  usuarios: { titulo: 'Cree las cuentas de su equipo', detalle: 'Una por persona, con el rol que le corresponde.', enlace: '/admin/usuarios', accion: 'Ir a Usuarios' },
  importar: { titulo: 'Cargue sus productos', detalle: 'Desde su Excel, sin escribirlos uno por uno.', enlace: '/admin/importar', accion: 'Importar Excel' },
  fotos: { titulo: 'Suba las fotos', detalle: 'Un producto sin foto no se publica.', enlace: '/admin/imagenes', accion: 'Ir a Imágenes' },
  borradores: { titulo: 'Publique los borradores', detalle: 'Complete lo que les falta para que se vean en la web.', enlace: '/admin/productos', accion: 'Ver borradores' }
};

// ---------------------------------------------------------------------------------------------
// Siguiente paso según el motivo de borrador (badge de estado). "campo" es el id que se enfoca.
// ---------------------------------------------------------------------------------------------
export const SIGUIENTE_PASO: Record<string, { texto: string; campo: string }> = {
  'sin-tipo': { texto: 'Elegir tipo', campo: 'pf-tipo' },
  'sin-precio': { texto: 'Agregar precio', campo: 'pf-precio' },
  'sin-foto': { texto: 'Agregar foto', campo: 'pf-fotos' },
  'sin-componentes': { texto: 'Agregar componentes', campo: 'pf-componentes' },
  oculto: { texto: 'Publicar', campo: 'pf-publicar' }
};

// ---------------------------------------------------------------------------------------------
// Pantallas vacías
// ---------------------------------------------------------------------------------------------
export const VACIOS = {
  productos: { titulo: 'Todavía no hay productos', texto: 'La forma más rápida de empezar es importar su lista de Excel. También puede crearlos uno por uno.' },
  productosFiltro: { titulo: 'Ningún producto coincide', texto: 'Pruebe con otra palabra o quite los filtros.' },
  inventario: { titulo: 'Todavía no hay productos en inventario', texto: 'El inventario se llena solo cuando hay productos. Cárguelos primero en Productos o con el Excel.' },
  inventarioFiltro: { titulo: 'Ninguna referencia coincide', texto: 'Revise lo que escribió o quite "Solo bajo mínimo".' },
  movimientos: { titulo: 'Sin movimientos todavía', texto: 'Cuando registre una entrada, salida o ajuste, aparecerá aquí.' },
  pedidos: { titulo: 'No hay pedidos', texto: 'Cuando un cliente envíe un pedido desde la web, llegará aquí. Asegúrese de que el WhatsApp de ventas esté en Ajustes.' },
  medida: { titulo: 'No hay solicitudes de fabricación a medida', texto: 'Llegan desde la página "Fabricación a medida" del sitio.' },
  recordatorios: { titulo: 'No hay recordatorios', texto: 'Los clientes los activan desde la ficha de cada producto.' },
  imagenes: { titulo: 'La biblioteca está vacía', texto: 'Suba las fotos de sus productos para poder publicarlos.' },
  filtroEstado: { titulo: 'Nada en este estado', texto: 'Elija "Todos los estados" para ver todo.' }
} as const;
