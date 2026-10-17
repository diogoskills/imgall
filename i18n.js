(function(root){
 'use strict';
 if(root.ClickImageI18n)return;
 const messages={
 "SEU OLHAR. SEU ARQUIVO.": {
  "en": "YOUR EYE. YOUR FILE.",
  "es": "TU MIRADA. TU ARCHIVO."
 },
 "BIBLIOTECA DA SESSÃO": {
  "en": "SESSION LIBRARY",
  "es": "BIBLIOTECA DE LA SESIÓN"
 },
 "Encontrou?": {
  "en": "Found it?",
  "es": "¿La encontraste?"
 },
 "Guarde o original.": {
  "en": "Keep the original.",
  "es": "Guarda el original."
 },
 "Selecione na página. Confira aqui.": {
  "en": "Select on the page. Preview here.",
  "es": "Selecciona en la página. Revisa aquí."
 },
 "Baixe só quando quiser.": {
  "en": "Download when you're ready.",
  "es": "Descarga cuando quieras."
 },
 "Pronto para selecionar": {
  "en": "Ready to select",
  "es": "Listo para seleccionar"
 },
 "Sua próxima imagem": {
  "en": "Your next image",
  "es": "Tu próxima imagen"
 },
 "começa com um clique.": {
  "en": "starts with a click.",
  "es": "empieza con un clic."
 },
 "Use “Caçar imagem” e clique": {
  "en": "Choose “Find image” and click",
  "es": "Pulsa “Buscar imagen” y haz clic"
 },
 "a foto que chamou sua atenção.": {
  "en": "the image that caught your eye.",
  "es": "en la imagen que te llamó la atención."
 },
 "cancela a seleção na página": {
  "en": "cancels selection on the page",
  "es": "cancela la selección en la página"
 },
 "Imagens selecionadas": {
  "en": "Selected images",
  "es": "Imágenes seleccionadas"
 },
 "SUAS IMAGENS": {
  "en": "YOUR IMAGES",
  "es": "TUS IMÁGENES"
 },
 "Abrir galeria de imagens": {
  "en": "Open image gallery",
  "es": "Abrir galería de imágenes"
 },
 "Limpar todas as imagens": {
  "en": "Clear all images",
  "es": "Borrar todas las imágenes"
 },
 "Visualização": {
  "en": "View",
  "es": "Vista"
 },
 "Lista": {
  "en": "List",
  "es": "Lista"
 },
 "Grade": {
  "en": "Grid",
  "es": "Cuadrícula"
 },
 "Galeria de imagens ampliadas": {
  "en": "Larger image gallery",
  "es": "Galería de imágenes ampliadas"
 },
 "Lista de imagens selecionadas": {
  "en": "Selected image list",
  "es": "Lista de imágenes seleccionadas"
 },
 "Edite o nome e baixe quando quiser. O arquivo mantém a qualidade encontrada no site.": {
  "en": "Edit the name and download when ready. The file keeps the quality available on the site.",
  "es": "Edita el nombre y descarga cuando quieras. El archivo conserva la calidad disponible en el sitio."
 },
 "Prévia da imagem selecionada": {
  "en": "Selected image preview",
  "es": "Vista previa de la imagen seleccionada"
 },
 "NOME DO ARQUIVO": {
  "en": "FILE NAME",
  "es": "NOMBRE DEL ARCHIVO"
 },
 "Nome do arquivo": {
  "en": "File name",
  "es": "Nombre del archivo"
 },
 "Verificando prévia…": {
  "en": "Checking preview…",
  "es": "Comprobando vista previa…"
 },
 "Remover imagem": {
  "en": "Remove image",
  "es": "Eliminar imagen"
 },
 "Copiar URL do arquivo encontrado": {
  "en": "Copy the original file URL",
  "es": "Copiar la URL del archivo original"
 },
 "Copiar URL da imagem": {
  "en": "Copy image URL",
  "es": "Copiar URL de la imagen"
 },
 "Pesquisar no Google Lens (envia a URL)": {
  "en": "Search with Google Lens (sends the URL)",
  "es": "Buscar con Google Lens (envía la URL)"
 },
 "Pesquisa reversa no Google Lens": {
  "en": "Reverse search with Google Lens",
  "es": "Búsqueda inversa con Google Lens"
 },
 "Abrir imagem em nova aba": {
  "en": "Open image in a new tab",
  "es": "Abrir imagen en una pestaña nueva"
 },
 "Abrir imagem": {
  "en": "Open image",
  "es": "Abrir imagen"
 },
 "Converter WebP estático em PNG, sem redimensionar": {
  "en": "Convert static WebP to PNG without resizing",
  "es": "Convertir WebP estático a PNG sin cambiar el tamaño"
 },
 "Pronta para baixar": {
  "en": "Ready to download",
  "es": "Lista para descargar"
 },
 "Baixar imagem": {
  "en": "Download image",
  "es": "Descargar imagen"
 },
 "Baixar todas": {
  "en": "Download all",
  "es": "Descargar todas"
 },
 "Formato do download": {
  "en": "Download format",
  "es": "Formato de descarga"
 },
 "Imagens individuais": {
  "en": "Individual images",
  "es": "Imágenes individuales"
 },
 "Arquivo ZIP": {
  "en": "ZIP archive",
  "es": "Archivo ZIP"
 },
 "Originais em ZIP; mantenha o painel aberto até concluir": {
  "en": "Originals in ZIP; keep the panel open until finished",
  "es": "Originales en ZIP; mantén el panel abierto hasta terminar"
 },
 "Caçar imagem": {
  "en": "Find image",
  "es": "Buscar imagen"
 },
 "Parar seleção": {
  "en": "Stop selection",
  "es": "Detener selección"
 },
 "Sem screenshots. Sem compressão extra.": {
  "en": "No screenshots. No extra compression.",
  "es": "Sin capturas. Sin compresión adicional."
 },
 "Mostrar ajuda": {
  "en": "Show help",
  "es": "Mostrar ayuda"
 },
 "Ajuda": {
  "en": "Help",
  "es": "Ayuda"
 },
 "Idioma": {
  "en": "Language",
  "es": "Idioma"
 },
 "Apoiar o ClickImage (abre em nova aba)": {
  "en": "Support ClickImage (opens in a new tab)",
  "es": "Apoyar ClickImage (abre una pestaña nueva)"
 },
 "Resolução indisponível": {
  "en": "Resolution unavailable",
  "es": "Resolución no disponible"
 },
 "Tamanho indisponível": {
  "en": "Size unavailable",
  "es": "Tamaño no disponible"
 },
 "Imagem selecionada": {
  "en": "Selected image",
  "es": "Imagen seleccionada"
 },
 "Clique em uma imagem na página": {
  "en": "Click an image on the page",
  "es": "Haz clic en una imagen de la página"
 },
 "Buscando a maior imagem disponível": {
  "en": "Finding the largest available image",
  "es": "Buscando la imagen más grande disponible"
 },
 "Precisamos da sua atenção": {
  "en": "Something needs your attention",
  "es": "Necesitamos tu atención"
 },
 "Pronto para caçar mais imagens": {
  "en": "Ready to find more images",
  "es": "Listo para buscar más imágenes"
 },
 "Pronto para começar": {
  "en": "Ready to start",
  "es": "Listo para empezar"
 },
 "Um clique na página.": {
  "en": "One click on the page.",
  "es": "Un clic en la página."
 },
 "A prévia aparece aqui.": {
  "en": "The preview appears here.",
  "es": "La vista previa aparece aquí."
 },
 "Passe o mouse sobre a foto e clique. Nenhum download começa automaticamente.": {
  "en": "Hover over the photo and click. Downloads never start automatically.",
  "es": "Pasa el cursor sobre la foto y haz clic. Las descargas no empiezan automáticamente."
 },
 "Use “Caçar imagem” para ativar a seleção na página.": {
  "en": "Choose “Find image” to enable selection on the page.",
  "es": "Pulsa “Buscar imagen” para activar la selección en la página."
 },
 "Procurando a melhor versão.": {
  "en": "Finding the best version.",
  "es": "Buscando la mejor versión."
 },
 "Aguarde alguns segundos para conferir a prévia.": {
  "en": "Wait a few seconds for the preview.",
  "es": "Espera unos segundos para ver la vista previa."
 },
 "Baixando em sequência…": {
  "en": "Downloading in sequence…",
  "es": "Descargando en secuencia…"
 },
 "URL original copiada.": {
  "en": "Original URL copied.",
  "es": "URL original copiada."
 },
 "Não foi possível copiar. Confira a permissão de área de transferência.": {
  "en": "Could not copy. Check clipboard permission.",
  "es": "No se pudo copiar. Revisa el permiso del portapapeles."
 },
 "Não foi possível abrir a pesquisa reversa.": {
  "en": "Could not open reverse image search.",
  "es": "No se pudo abrir la búsqueda inversa."
 },
 "Não foi possível baixar o PNG.": {
  "en": "Could not download the PNG.",
  "es": "No se pudo descargar el PNG."
 },
 "O site bloqueou a conversão. O download original continua disponível.": {
  "en": "The site blocked conversion. The original download is still available.",
  "es": "El sitio bloqueó la conversión. La descarga original sigue disponible."
 },
 "Prévia indisponível": {
  "en": "Preview unavailable",
  "es": "Vista previa no disponible"
 },
 "Imagem encontrada": {
  "en": "Image found",
  "es": "Imagen encontrada"
 },
 "Convertendo…": {
  "en": "Converting…",
  "es": "Convirtiendo…"
 },
 "PNG baixando…": {
  "en": "Downloading PNG…",
  "es": "Descargando PNG…"
 },
 "PNG salva ✓": {
  "en": "PNG saved ✓",
  "es": "PNG guardado ✓"
 },
 "PNG (beta)": {
  "en": "PNG (beta)",
  "es": "PNG (beta)"
 },
 "Baixando…": {
  "en": "Downloading…",
  "es": "Descargando…"
 },
 "Salva ✓": {
  "en": "Saved ✓",
  "es": "Guardada ✓"
 },
 "Na fila": {
  "en": "Queued",
  "es": "En cola"
 },
 "Arquivo salvo": {
  "en": "File saved",
  "es": "Archivo guardado"
 },
 "Download solicitado": {
  "en": "Download requested",
  "es": "Descarga solicitada"
 },
 "Tente novamente": {
  "en": "Try again",
  "es": "Inténtalo de nuevo"
 },
 "Aguardando sua vez": {
  "en": "Waiting in queue",
  "es": "Esperando turno"
 },
 "Sem compressão extra": {
  "en": "No extra compression",
  "es": "Sin compresión adicional"
 },
 "Não foi possível ler as imagens.": {
  "en": "Could not read the images.",
  "es": "No se pudieron leer las imágenes."
 },
 "Não foi possível concluir a ação.": {
  "en": "Could not complete the action.",
  "es": "No se pudo completar la acción."
 },
 "Feche e abra o painel novamente.": {
  "en": "Close and reopen the panel.",
  "es": "Cierra y vuelve a abrir el panel."
 },
 "Não foi possível iniciar o lote.": {
  "en": "Could not start the batch.",
  "es": "No se pudo iniciar el lote."
 },
 "Não foi possível abrir a imagem.": {
  "en": "Could not open the image.",
  "es": "No se pudo abrir la imagen."
 },
 "Imagem aberta. O Chrome não permitiu ajustar o zoom desta aba.": {
  "en": "Image opened. Chrome could not adjust this tab's zoom.",
  "es": "Imagen abierta. Chrome no permitió ajustar el zoom de esta pestaña."
 },
 "Download do ZIP interrompido. Confira os downloads do Chrome.": {
  "en": "ZIP download interrupted. Check Chrome downloads.",
  "es": "Descarga del ZIP interrumpida. Revisa las descargas de Chrome."
 },
 "ZIP cancelado.": {
  "en": "ZIP cancelled.",
  "es": "ZIP cancelado."
 },
 "Download não encontrado.": {
  "en": "Download not found.",
  "es": "Descarga no encontrada."
 },
 "Não foi possível conferir o download do ZIP.": {
  "en": "Could not check the ZIP download.",
  "es": "No se pudo comprobar la descarga del ZIP."
 },
 "Preparando ZIP · mantenha o painel aberto…": {
  "en": "Preparing ZIP · keep the panel open…",
  "es": "Preparando ZIP · mantén el panel abierto…"
 },
 "Salvando ZIP…": {
  "en": "Saving ZIP…",
  "es": "Guardando ZIP…"
 },
 "Não foi possível criar o ZIP.": {
  "en": "Could not create the ZIP.",
  "es": "No se pudo crear el ZIP."
 },
 "URL de imagem inválida.": {
  "en": "Invalid image URL.",
  "es": "URL de imagen no válida."
 },
 "URL inválida.": {
  "en": "Invalid URL.",
  "es": "URL no válida."
 },
 "O site não permitiu obter o WebP para conversão.": {
  "en": "The site did not allow reading the WebP for conversion.",
  "es": "El sitio no permitió obtener el WebP para convertirlo."
 },
 "A beta aceita arquivos de até 16 MB.": {
  "en": "The beta supports files up to 16 MB.",
  "es": "La beta admite archivos de hasta 16 MB."
 },
 "O recurso recebido não é WebP.": {
  "en": "The received resource is not WebP.",
  "es": "El recurso recibido no es WebP."
 },
 "WebP animado ainda não é suportado na conversão beta.": {
  "en": "Animated WebP is not supported by the beta converter.",
  "es": "La conversión beta aún no admite WebP animado."
 },
 "A beta aceita imagens de até 16 megapixels.": {
  "en": "The beta supports images up to 16 megapixels.",
  "es": "La beta admite imágenes de hasta 16 megapíxeles."
 },
 "O PNG resultante ultrapassou o limite de 16 MB da beta.": {
  "en": "The resulting PNG exceeds the beta's 16 MB limit.",
  "es": "El PNG resultante supera el límite de 16 MB de la beta."
 },
 "Não foi possível preparar o PNG.": {
  "en": "Could not prepare the PNG.",
  "es": "No se pudo preparar el PNG."
 },
 "A conversão demorou demais. Tente baixar o original.": {
  "en": "Conversion timed out. Try downloading the original.",
  "es": "La conversión tardó demasiado. Intenta descargar el original."
 },
 "O site bloqueou a leitura para conversão. Use o download original.": {
  "en": "The site blocked reading for conversion. Download the original.",
  "es": "El sitio bloqueó la lectura para convertir. Descarga el original."
 },
 "O site não permitiu obter o arquivo.": {
  "en": "The site did not allow reading the file.",
  "es": "El sitio no permitió obtener el archivo."
 },
 "Redirecionamento inválido.": {
  "en": "Invalid redirect.",
  "es": "Redirección no válida."
 },
 "Limite de tamanho do ZIP excedido.": {
  "en": "ZIP size limit exceeded.",
  "es": "Se superó el límite de tamaño del ZIP."
 },
 "O recurso recebido não é uma imagem reconhecida.": {
  "en": "The resource is not a recognized image.",
  "es": "El recurso no es una imagen reconocida."
 },
 "SVG inválido.": {
  "en": "Invalid SVG.",
  "es": "SVG no válido."
 },
 "Tempo de leitura excedido.": {
  "en": "Reading timed out.",
  "es": "Se agotó el tiempo de lectura."
 },
 "Leitura bloqueada pelo site (CORS ou rede).": {
  "en": "Reading blocked by the site (CORS or network).",
  "es": "Lectura bloqueada por el sitio (CORS o red)."
 },
 "O ZIP aceita até 1.000 imagens por vez.": {
  "en": "ZIP supports up to 1,000 images at a time.",
  "es": "El ZIP admite hasta 1.000 imágenes a la vez."
 },
 "Nenhuma imagem pôde ser obtida para o ZIP.": {
  "en": "No images could be retrieved for the ZIP.",
  "es": "No se pudo obtener ninguna imagen para el ZIP."
 },
 "Imagem": {
  "en": "Image",
  "es": "Imagen"
 },
 "A seleção já está ativa. ESC cancela.": {
  "en": "Selection is already active. ESC cancels.",
  "es": "La selección ya está activa. ESC cancela."
 },
 "Não foi possível abrir o painel ClickImage.": {
  "en": "Could not open the ClickImage panel.",
  "es": "No se pudo abrir el panel de ClickImage."
 },
 "Abra uma página HTTP/HTTPS e clique no ícone da extensão nessa aba para permitir a seleção.": {
  "en": "Open an HTTP/HTTPS page and click the extension icon in that tab to enable selection.",
  "es": "Abre una página HTTP/HTTPS y pulsa el icono de la extensión en esa pestaña para activar la selección."
 },
 "Download interrompido. Confira os downloads do Chrome ou tente novamente.": {
  "en": "Download interrupted. Check Chrome downloads or try again.",
  "es": "Descarga interrumpida. Revisa las descargas de Chrome o inténtalo de nuevo."
 },
 "Esta imagem já foi solicitada ou não está disponível.": {
  "en": "This image has already been requested or is unavailable.",
  "es": "Esta imagen ya fue solicitada o no está disponible."
 },
 "Não foi possível iniciar o download. A URL pode ter expirado.": {
  "en": "Could not start the download. The URL may have expired.",
  "es": "No se pudo iniciar la descarga. La URL puede haber caducado."
 },
 "PNG já solicitado ou imagem removida.": {
  "en": "PNG already requested or image removed.",
  "es": "PNG ya solicitado o imagen eliminada."
 },
 "PNG inválido ou grande demais.": {
  "en": "PNG is invalid or too large.",
  "es": "El PNG no es válido o es demasiado grande."
 },
 "Digite um nome válido.": {
  "en": "Enter a valid name.",
  "es": "Introduce un nombre válido."
 },
 "Não foi possível iniciar o download PNG.": {
  "en": "Could not start the PNG download.",
  "es": "No se pudo iniciar la descarga del PNG."
 },
 "O download em lote já está em andamento.": {
  "en": "A batch download is already running.",
  "es": "Ya hay una descarga por lotes en curso."
 },
 "Baixar todas está disponível a partir de quatro imagens.": {
  "en": "Download all is available with four or more images.",
  "es": "Descargar todas está disponible a partir de cuatro imágenes."
 },
 "Não há imagens pendentes para baixar.": {
  "en": "There are no pending images to download.",
  "es": "No hay imágenes pendientes de descarga."
 },
 "Confira os nomes dos arquivos.": {
  "en": "Check the file names.",
  "es": "Revisa los nombres de los archivos."
 },
 "Digite um nome válido para cada imagem.": {
  "en": "Enter a valid name for each image.",
  "es": "Introduce un nombre válido para cada imagen."
 },
 "Imagem removida.": {
  "en": "Image removed.",
  "es": "Imagen eliminada."
 },
 "Aguarde o download ou selecione uma imagem válida.": {
  "en": "Wait for the download or select a valid image.",
  "es": "Espera la descarga o selecciona una imagen válida."
 },
 "Digite um nome válido para a imagem.": {
  "en": "Enter a valid image name.",
  "es": "Introduce un nombre válido para la imagen."
 },
 "Seleção expirada. Clique em Caçar imagem.": {
  "en": "Selection expired. Click Find image.",
  "es": "La selección caducó. Pulsa Buscar imagen."
 },
 "Imagem sem URL direta válida.": {
  "en": "Image has no valid direct URL.",
  "es": "La imagen no tiene una URL directa válida."
 },
 "Não foi possível atualizar o painel. Tente novamente.": {
  "en": "Could not update the panel. Try again.",
  "es": "No se pudo actualizar el panel. Inténtalo de nuevo."
 },
 "Seleção cancelada.": {
  "en": "Selection cancelled.",
  "es": "Selección cancelada."
 },
 "Buscando a maior imagem disponível…": {
  "en": "Finding the largest available image…",
  "es": "Buscando la imagen más grande disponible…"
 },
 "Esta imagem não possui uma URL HTTP/HTTPS direta acessível.": {
  "en": "This image has no accessible direct HTTP/HTTPS URL.",
  "es": "Esta imagen no tiene una URL HTTP/HTTPS directa accesible."
 },
 "A thumbnail estática não está disponível. A prévia animada não será baixada.": {
  "en": "The static thumbnail is unavailable. The animated preview will not be downloaded.",
  "es": "La miniatura estática no está disponible. No se descargará la vista previa animada."
 },
 "Imagem no painel. Continue selecionando · ESC encerra.": {
  "en": "Image added to the panel. Keep selecting · ESC stops.",
  "es": "Imagen añadida al panel. Sigue seleccionando · ESC termina."
 },
 "Não foi possível guardar esta imagem.": {
  "en": "Could not save this image to the panel.",
  "es": "No se pudo guardar esta imagen en el panel."
 },
 "A extensão foi desconectada. Recarregue a página e tente novamente.": {
  "en": "The extension was disconnected. Reload the page and try again.",
  "es": "La extensión se desconectó. Recarga la página e inténtalo de nuevo."
 },
 "A extensão foi atualizada. Recarregue a página.": {
  "en": "The extension was updated. Reload the page.",
  "es": "La extensión se actualizó. Recarga la página."
 },
 "Aguarde a busca da imagem selecionada.": {
  "en": "Wait for the selected image search.",
  "es": "Espera la búsqueda de la imagen seleccionada."
 },
 "ClickImage ativo · clique em uma imagem · ESC cancela": {
  "en": "ClickImage active · click an image · ESC cancels",
  "es": "ClickImage activo · haz clic en una imagen · ESC cancela"
 },
 "Não foi possível salvar o idioma.": {
  "en": "Could not save the language preference.",
  "es": "No se pudo guardar la preferencia de idioma."
 },
 "ClickImage — selecionar imagem": {
  "en": "ClickImage — select image",
  "es": "ClickImage — seleccionar imagen"
 },
 "Selecione uma imagem da página e baixe seu arquivo original.": {
  "en": "Select an image on the page and download its original file.",
  "es": "Selecciona una imagen de la página y descarga su archivo original."
 },
 "Clique no ícone ClickImage na aba do site para permitir a seleção. ESC ou Parar seleção encerram a caça. As imagens permanecem na lista. A pesquisa reversa envia a URL escolhida ao Google Lens somente quando você clica no ícone de lupa. Baixar todas permite arquivos individuais ou ZIP. Mantenha o painel visível até ZIP salvo; imagens cuja leitura o site bloquear ficam fora do arquivo, com indicação da falha. A prévia pode falhar se o site bloquear seu carregamento; o arquivo escolhido continua disponível para confirmação.": {
  "en": "Click the ClickImage icon on the site tab to allow selection. ESC or Stop selection ends the search. Images stay in the list. Reverse search sends the chosen URL to Google Lens only when you click the search icon. Download all offers individual files or ZIP. Keep the panel visible until ZIP saved; images the site blocks from reading are excluded, with a failure message. A preview may fail if the site blocks loading; you can still confirm the original download.",
  "es": "Pulsa el icono de ClickImage en la pestaña del sitio para permitir la selección. ESC o Detener selección termina la búsqueda. Las imágenes permanecen en la lista. La búsqueda inversa envía la URL elegida a Google Lens solo cuando pulsas la lupa. Descargar todas ofrece archivos individuales o ZIP. Mantén el panel visible hasta ZIP guardado; las imágenes cuya lectura bloquee el sitio quedan fuera, con un mensaje de error. La vista previa puede fallar si el sitio bloquea su carga; aún puedes confirmar la descarga original."
 },
 "{count} imagem": {
  "en": "{count} image",
  "es": "{count} imagen"
 },
 "{count} imagens": {
  "en": "{count} images",
  "es": "{count} imágenes"
 },
 "Ver {name}": {
  "en": "View {name}",
  "es": "Ver {name}"
 },
 "{finished} de {total} concluídas": {
  "en": "{finished} of {total} completed",
  "es": "{finished} de {total} completadas"
 },
 "Lote finalizado: {count} salvas": {
  "en": "Batch finished: {count} saved",
  "es": "Lote terminado: {count} guardadas"
 },
 ", {count} com erro": {
  "en": ", {count} failed",
  "es": ", {count} con error"
 },
 "ZIP: {finished} de {total} verificadas · {included} incluídas": {
  "en": "ZIP: {finished} of {total} checked · {included} included",
  "es": "ZIP: {finished} de {total} comprobadas · {included} incluidas"
 },
 " · {count} com erro": {
  "en": " · {count} failed",
  "es": " · {count} con error"
 },
 "ZIP salvo: {count} imagens": {
  "en": "ZIP saved: {count} images",
  "es": "ZIP guardado: {count} imágenes"
 },
 " · {count} não incluídas: ": {
  "en": " · {count} excluded: ",
  "es": " · {count} no incluidas: "
 }
};
 Object.assign(messages,{
 "Biblioteca": {
  "en": "Library",
  "es": "Biblioteca"
 },
 "Referências permanentes ↗": {
  "en": "Permanent references ↗",
  "es": "Referencias permanentes ↗"
 },
 "Salvar na Biblioteca": {
  "en": "Save to Library",
  "es": "Guardar en la Biblioteca"
 },
 "Pasta de destino": {
  "en": "Destination folder",
  "es": "Carpeta de destino"
 },
 "Nova pasta": {
  "en": "New folder",
  "es": "Nueva carpeta"
 },
 "Nome da pasta": {
  "en": "Folder name",
  "es": "Nombre de la carpeta"
 },
 "Cancelar": {
  "en": "Cancel",
  "es": "Cancelar"
 },
 "Salvar": {
  "en": "Save",
  "es": "Guardar"
 },
 "Salvando original…": {
  "en": "Saving original…",
  "es": "Guardando original…"
 },
 "A imagem já está nesta pasta.": {
  "en": "This image is already in this folder.",
  "es": "Esta imagen ya está en esta carpeta."
 },
 "Imagem salva na Biblioteca.": {
  "en": "Image saved to Library.",
  "es": "Imagen guardada en la Biblioteca."
 },
 "BIBLIOTECA DE REFERÊNCIAS": {
  "en": "REFERENCE LIBRARY",
  "es": "BIBLIOTECA DE REFERENCIAS"
 },
 "Menu da Biblioteca": {
  "en": "Library menu",
  "es": "Menú de la Biblioteca"
 },
 "Exportar Biblioteca": {
  "en": "Export Library",
  "es": "Exportar Biblioteca"
 },
 "Importar Biblioteca": {
  "en": "Import Library",
  "es": "Importar Biblioteca"
 },
 "Exportar pastas em ZIPs": {
  "en": "Export folders as ZIPs",
  "es": "Exportar carpetas como ZIP"
 },
 "Faça backup das suas referências para restaurá-las em outro navegador ou computador. Seus dados são armazenados localmente.": {
  "en": "Back up your references to restore them in another browser or computer. Your data is stored locally.",
  "es": "Haz una copia de tus referencias para restaurarlas en otro navegador u ordenador. Tus datos se guardan localmente."
 },
 "PASTAS": {
  "en": "FOLDERS",
  "es": "CARPETAS"
 },
 "Marque pastas para exportar ZIPs separados.": {
  "en": "Check folders to export separate ZIPs.",
  "es": "Marca carpetas para exportar ZIP separados."
 },
 "Pastas da Biblioteca": {
  "en": "Library folders",
  "es": "Carpetas de la Biblioteca"
 },
 "Pesquisar imagens pelo nome": {
  "en": "Search images by name",
  "es": "Buscar imágenes por nombre"
 },
 "Baixar imagens": {
  "en": "Download images",
  "es": "Descargar imágenes"
 },
 "Baixar ZIP": {
  "en": "Download ZIP",
  "es": "Descargar ZIP"
 },
 "Renomear pasta": {
  "en": "Rename folder",
  "es": "Renombrar carpeta"
 },
 "Excluir pasta": {
  "en": "Delete folder",
  "es": "Eliminar carpeta"
 },
 "Selecionar todas": {
  "en": "Select all",
  "es": "Seleccionar todas"
 },
 "Selecionar imagem": {
  "en": "Select image",
  "es": "Seleccionar imagen"
 },
 "Organizar": {
  "en": "Organize",
  "es": "Organizar"
 },
 "Copiar para pasta": {
  "en": "Copy to folder",
  "es": "Copiar a carpeta"
 },
 "Mover para pasta": {
  "en": "Move to folder",
  "es": "Mover a carpeta"
 },
 "Excluir selecionadas": {
  "en": "Delete selected",
  "es": "Eliminar seleccionadas"
 },
 "Imagens da Biblioteca": {
  "en": "Library images",
  "es": "Imágenes de la Biblioteca"
 },
 "Um lugar para suas referências.": {
  "en": "A home for your references.",
  "es": "Un lugar para tus referencias."
 },
 "Use “Salvar na Biblioteca” nas imagens do painel lateral. Os arquivos originais ficam guardados aqui.": {
  "en": "Use “Save to Library” on images in the side panel. Original files are stored here.",
  "es": "Usa “Guardar en la Biblioteca” en las imágenes del panel lateral. Los archivos originales se guardan aquí."
 },
 "Mostrar mais imagens": {
  "en": "Show more images",
  "es": "Mostrar más imágenes"
 },
 "Suas referências são armazenadas localmente neste navegador. Não utilizamos contas nem sincronização em nuvem.": {
  "en": "Your references are stored locally in this browser. We do not use accounts or cloud sync.",
  "es": "Tus referencias se guardan localmente en este navegador. No usamos cuentas ni sincronización en la nube."
 },
 "Remover a extensão ou excluir seus dados pode apagar a Biblioteca. Mantenha um backup.": {
  "en": "Removing the extension or clearing its data can erase the Library. Keep a backup.",
  "es": "Eliminar la extensión o borrar sus datos puede borrar la Biblioteca. Guarda una copia de seguridad."
 },
 "Os arquivos serão validados antes de alterar seus dados.": {
  "en": "Files will be validated before changing your data.",
  "es": "Los archivos se validarán antes de modificar tus datos."
 },
 "Mesclar — preservar dados e evitar duplicidades": {
  "en": "Merge — keep data and avoid duplicates",
  "es": "Combinar — conservar datos y evitar duplicados"
 },
 "Substituir — apagar a Biblioteca atual e restaurar o backup": {
  "en": "Replace — erase the current Library and restore the backup",
  "es": "Reemplazar — borrar la Biblioteca actual y restaurar la copia"
 },
 "Importar": {
  "en": "Import",
  "es": "Importar"
 },
 "Exportar pasta {name}": {
  "en": "Export folder {name}",
  "es": "Exportar carpeta {name}"
 },
 "{count} selecionadas": {
  "en": "{count} selected",
  "es": "{count} seleccionadas"
 },
 "Original salvo localmente": {
  "en": "Original stored locally",
  "es": "Original guardado localmente"
 },
 "URL de origem não incluída no backup.": {
  "en": "Source URL is not included in the backup.",
  "es": "La URL de origen no se incluye en la copia."
 },
 "Processando {finished} de {total}…": {
  "en": "Processing {finished} of {total}…",
  "es": "Procesando {finished} de {total}…"
 },
 "Concluído: {count} imagens.": {
  "en": "Done: {count} images.",
  "es": "Completado: {count} imágenes."
 },
 "Falhas: {count}": {
  "en": "Failures: {count}",
  "es": "Errores: {count}"
 },
 "Excluir esta pasta e suas referências? As outras pastas serão preservadas.": {
  "en": "Delete this folder and its references? Other folders will be kept.",
  "es": "¿Eliminar esta carpeta y sus referencias? Se conservarán las otras carpetas."
 },
 "Excluir as imagens selecionadas desta pasta?": {
  "en": "Delete selected images from this folder?",
  "es": "¿Eliminar las imágenes seleccionadas de esta carpeta?"
 },
 "Organização concluída.": {
  "en": "Organization complete.",
  "es": "Organización completada."
 },
 "Pasta vazia.": {
  "en": "Empty folder.",
  "es": "Carpeta vacía."
 },
 "ZIPs salvos: {count}": {
  "en": "ZIPs saved: {count}",
  "es": "ZIP guardados: {count}"
 },
 "Salvando backup…": {
  "en": "Saving backup…",
  "es": "Guardando copia…"
 },
 "Backup salvo. Guarde este arquivo em um local seguro.": {
  "en": "Backup saved. Keep this file in a safe place.",
  "es": "Copia guardada. Guarda este archivo en un lugar seguro."
 },
 "Apagar toda a Biblioteca atual e substituí-la pelo backup? Esta ação só acontece após a validação completa.": {
  "en": "Erase the entire current Library and replace it with the backup? This only happens after full validation.",
  "es": "¿Borrar toda la Biblioteca actual y reemplazarla con la copia? Esto solo ocurre tras la validación completa."
 },
 "Validando {finished} de {total}…": {
  "en": "Validating {finished} of {total}…",
  "es": "Validando {finished} de {total}…"
 },
 "Restauradas: {folders} pastas, {images} imagens. Duplicidades evitadas: {duplicates}.": {
  "en": "Restored: {folders} folders, {images} images. Duplicates avoided: {duplicates}.",
  "es": "Restauradas: {folders} carpetas, {images} imágenes. Duplicados evitados: {duplicates}."
 },
 "Digite um nome de pasta de até 80 caracteres.": {
  "en": "Enter a folder name up to 80 characters.",
  "es": "Escribe un nombre de carpeta de hasta 80 caracteres."
 },
 "Já existe uma pasta com esse nome.": {
  "en": "A folder with this name already exists.",
  "es": "Ya existe una carpeta con ese nombre."
 },
 "Pasta não encontrada.": {
  "en": "Folder not found.",
  "es": "Carpeta no encontrada."
 },
 "O arquivo local está indisponível. Restaure um backup.": {
  "en": "The local file is unavailable. Restore a backup.",
  "es": "El archivo local no está disponible. Restaura una copia."
 },
 "Cada imagem da Biblioteca deve ter até 32 MB.": {
  "en": "Each Library image must be up to 32 MB.",
  "es": "Cada imagen de la Biblioteca debe tener hasta 32 MB."
 },
 "Arquivo de imagem inválido ou formato não suportado na Biblioteca.": {
  "en": "Invalid image or format not supported in the Library.",
  "es": "Imagen inválida o formato no compatible con la Biblioteca."
 },
 "Backup inválido, corrompido ou de versão não suportada.": {
  "en": "Invalid, damaged or unsupported backup version.",
  "es": "Copia inválida, dañada o de versión no compatible."
 },
 "A substituição exige confirmação explícita.": {
  "en": "Replacement requires explicit confirmation.",
  "es": "El reemplazo requiere confirmación explícita."
 },
 "O backup excede o limite de 128 MB de imagens.": {
  "en": "The backup exceeds the 128 MB image limit.",
  "es": "La copia supera el límite de 128 MB de imágenes."
 },
 "O backup aceita até 128 MB.": {
  "en": "Backups support up to 128 MB.",
  "es": "Las copias admiten hasta 128 MB."
 },
 "Não foi possível gravar. O armazenamento local pode estar cheio. Exporte um backup ou libere espaço.": {
  "en": "Could not save. Local storage may be full. Export a backup or free up space.",
  "es": "No se pudo guardar. El almacenamiento local puede estar lleno. Exporta una copia o libera espacio."
 },
 "Limite da Biblioteca: 200 pastas, 5.000 imagens, 20.000 referências e 512 MB. Exporte um backup ou remova referências.": {
  "en": "Library limit: 200 folders, 5,000 images, 20,000 references and 512 MB. Export a backup or remove references.",
  "es": "Límite de la Biblioteca: 200 carpetas, 5.000 imágenes, 20.000 referencias y 512 MB. Exporta una copia o elimina referencias."
 },
 "A alteração foi cancelada. Os dados anteriores foram preservados.": {
  "en": "The change was canceled. Previous data was preserved.",
  "es": "Se canceló el cambio. Se conservaron los datos anteriores."
 },
 "O backup aceita até 128 MB. Exporte pastas separadamente para guardar as imagens.": {
  "en": "Backups support up to 128 MB. Export folders separately to save images.",
  "es": "Las copias admiten hasta 128 MB. Exporta carpetas por separado para guardar las imágenes."
 },
 "Metadados do backup excederam o limite.": {
  "en": "Backup metadata exceeded the limit.",
  "es": "Los metadatos de la copia superaron el límite."
 },
 "Download interrompido. Confira os downloads do Chrome.": {
  "en": "Download interrupted. Check Chrome downloads.",
  "es": "Descarga interrumpida. Revisa las descargas de Chrome."
 },
 "Não foi possível conferir o download.": {
  "en": "Could not check the download.",
  "es": "No se pudo comprobar la descarga."
 },
 "Cancelado.": {
  "en": "Canceled.",
  "es": "Cancelado."
 }
});
 Object.assign(messages,{
 "Nome da Biblioteca": {
  "en": "Library name",
  "es": "Nombre de la Biblioteca"
 },
 "Nova Biblioteca": {
  "en": "New Library",
  "es": "Nueva Biblioteca"
 },
 "Renomear Biblioteca": {
  "en": "Rename Library",
  "es": "Renombrar Biblioteca"
 },
 "Biblioteca não encontrada.": {
  "en": "Library not found.",
  "es": "Biblioteca no encontrada."
 },
 "Já existe uma Biblioteca com esse nome.": {
  "en": "A Library with this name already exists.",
  "es": "Ya existe una Biblioteca con ese nombre."
 },
 "Salva em “{name}” ({count} imagens).": {
  "en": "Saved in “{name}” ({count} images).",
  "es": "Guardada en “{name}” ({count} imágenes)."
 },
 "A imagem já está na pasta “{name}” ({count} imagens).": {
  "en": "This image is already in “{name}” ({count} images).",
  "es": "Esta imagen ya está en “{name}” ({count} imágenes)."
 },
 "BACKUP DA BIBLIOTECA": {
  "en": "LIBRARY BACKUP",
  "es": "COPIA DE LA BIBLIOTECA"
 },
 "Cada importação cria uma nova Biblioteca, preservando as existentes.": {
  "en": "Each import creates a new Library, preserving existing ones.",
  "es": "Cada importación crea una nueva Biblioteca y conserva las existentes."
 },
 "Biblioteca acima de 16 MB: usando ZIP com JSON e imagens para reduzir o uso de memória.": {
  "en": "Library over 16 MB: using a ZIP with JSON and images to reduce memory use.",
  "es": "Biblioteca de más de 16 MB: se usa un ZIP con JSON e imágenes para reducir el uso de memoria."
 },
 "Biblioteca “{name}” importada: {folders} pastas e {images} imagens. Indisponíveis: {failed}.": {
  "en": "Library “{name}” imported: {folders} folders and {images} images. Unavailable: {failed}.",
  "es": "Biblioteca “{name}” importada: {folders} carpetas y {images} imágenes. No disponibles: {failed}."
 },
 "A importação cria uma nova Biblioteca e preserva as existentes.": {
  "en": "Import creates a new Library and preserves existing ones.",
  "es": "La importación crea una nueva Biblioteca y conserva las existentes."
 },
 "Arquivo não incluído no backup.": {
  "en": "File not included in the backup.",
  "es": "Archivo no incluido en la copia."
 },
 "Backups JSON devem ter até 28 MB.": {
  "en": "JSON backups must be up to 28 MB.",
  "es": "Las copias JSON deben tener hasta 28 MB."
 }
});
 Object.assign(messages,{
 "GRUPOS": {
  "en": "GROUPS",
  "es": "GRUPOS"
 },
 "Novo grupo": {
  "en": "New group",
  "es": "Nuevo grupo"
 },
 "Novo conjunto": {
  "en": "New set",
  "es": "Nuevo conjunto"
 },
 "Nome do grupo": {
  "en": "Group name",
  "es": "Nombre del grupo"
 },
 "Nome do conjunto": {
  "en": "Set name",
  "es": "Nombre del conjunto"
 },
 "Expandir ou recolher grupo": {
  "en": "Expand or collapse group",
  "es": "Expandir o contraer grupo"
 },
 "Mover grupo ou conjunto": {
  "en": "Move group or set",
  "es": "Mover grupo o conjunto"
 },
 "Grupo de destino": {
  "en": "Destination group",
  "es": "Grupo de destino"
 },
 "Primeiro nível (grupo)": {
  "en": "Top level (group)",
  "es": "Primer nivel (grupo)"
 },
 "Crie conjuntos dentro de um grupo.": {
  "en": "Create sets inside a group.",
  "es": "Crea conjuntos dentro de un grupo."
 },
 "Pasta de destino inválida.": {
  "en": "Invalid destination folder.",
  "es": "Carpeta de destino inválida."
 },
 "Uma pasta não pode ficar dentro dela mesma ou de suas subpastas.": {
  "en": "Groups cannot be nested inside themselves or their sets.",
  "es": "Los grupos no pueden estar dentro de sí mismos ni de sus conjuntos."
 },
 "Excluir esta pasta, seus conjuntos e suas referências? As outras pastas serão preservadas.": {
  "en": "Delete this folder, its sets and references? Other folders will be kept.",
  "es": "¿Eliminar esta carpeta, sus conjuntos y referencias? Se conservarán las otras carpetas."
 },
 "Arquivos indisponíveis: {count}.": {
  "en": "Unavailable files: {count}.",
  "es": "Archivos no disponibles: {count}."
 },
 "Grupos incluem seus conjuntos no ZIP.": {
  "en": "Groups include their sets in the ZIP.",
  "es": "Los grupos incluyen sus conjuntos en el ZIP."
 },
 "Limite local: 50 Bibliotecas, 200 pastas, 5.000 imagens, 20.000 referências e 512 MB.": {
  "en": "Local limit: 50 Libraries, 200 folders, 5,000 images, 20,000 references and 512 MB.",
  "es": "Límite local: 50 Bibliotecas, 200 carpetas, 5.000 imágenes, 20.000 referencias y 512 MB."
 }
});
 Object.assign(messages,{Grupo:{en:'Group',es:'Grupo'},Conjunto:{en:'Set',es:'Conjunto'}});
 Object.assign(messages,{'A Biblioteca aceita imagens de até 64 megapixels e 32.768 px por lado. O download original continua disponível.':{en:'The Library supports images up to 64 megapixels and 32,768 px per side. The original download is still available.',es:'La Biblioteca admite imágenes de hasta 64 megapíxeles y 32.768 px por lado. La descarga original sigue disponible.'}});
 Object.assign(messages,{'Seleção ativa · clique apenas em imagens · Parar seleção ou ESC para navegar':{en:'Selection active · click images only · Stop selection or ESC to browse',es:'Selección activa · haz clic solo en imágenes · Detener selección o ESC para navegar'}});
 Object.assign(messages,{
 "Exportar Biblioteca .json": {
  "en": "Export Library .json",
  "es": "Exportar Biblioteca .json"
 },
 "Importar Biblioteca .json": {
  "en": "Import Library .json",
  "es": "Importar Biblioteca .json"
 },
 "Subgrupo": {
  "en": "Subgroup",
  "es": "Subgrupo"
 },
 "Nome do subgrupo": {
  "en": "Subgroup name",
  "es": "Nombre del subgrupo"
 },
 "Mostrar mais itens": {
  "en": "Show more items",
  "es": "Mostrar más elementos"
 },
 "Colunas": {
  "en": "Columns",
  "es": "Columnas"
 },
 "Agrupar": {
  "en": "Group",
  "es": "Agrupar"
 },
 "Selecionar {name}": {
  "en": "Select {name}",
  "es": "Seleccionar {name}"
 },
 "{count} imagens selecionadas": {
  "en": "{count} images selected",
  "es": "{count} imágenes seleccionadas"
 },
 "Criar subgrupo": {
  "en": "Create subgroup",
  "es": "Crear subgrupo"
 },
 "Criar grupo dentro deste": {
  "en": "Create group inside this one",
  "es": "Crear grupo dentro de este"
 },
 "Grupos incluem todos os descendentes no ZIP.": {
  "en": "Groups include all descendants in the ZIP.",
  "es": "Los grupos incluyen todos los descendientes en el ZIP."
 },
 "Gerenciar Bibliotecas": {
  "en": "Manage Libraries",
  "es": "Administrar Bibliotecas"
 },
 "Apagar todos os dados da Biblioteca": {
  "en": "Erase all Library data",
  "es": "Borrar todos los datos de la Biblioteca"
 },
 "Todas as Bibliotecas, grupos e imagens locais serão apagados. Downloads e configurações gerais serão preservados.": {
  "en": "All Libraries, groups and local images will be erased. Downloads and general settings will be kept.",
  "es": "Se borrarán todas las Bibliotecas, grupos e imágenes locales. Se conservarán las descargas y los ajustes generales."
 },
 "Digite APAGAR para confirmar.": {
  "en": "Type APAGAR to confirm.",
  "es": "Escribe APAGAR para confirmar."
 },
 "Apagar tudo": {
  "en": "Erase all",
  "es": "Borrar todo"
 },
 "Dados da Biblioteca apagados. Downloads e configurações gerais preservados.": {
  "en": "Library data erased. Downloads and general settings kept.",
  "es": "Datos de la Biblioteca borrados. Descargas y ajustes generales conservados."
 },
 "Ações do item": {
  "en": "Item actions",
  "es": "Acciones del elemento"
 },
 "Abrir / Expandir": {
  "en": "Open / Expand",
  "es": "Abrir / Expandir"
 },
 "Renomear": {
  "en": "Rename",
  "es": "Renombrar"
 },
 "Mover para outro grupo": {
  "en": "Move to another group",
  "es": "Mover a otro grupo"
 },
 "Baixar .ZIP": {
  "en": "Download .ZIP",
  "es": "Descargar .ZIP"
 },
 "Excluir": {
  "en": "Delete",
  "es": "Eliminar"
 },
 "Mover para grupo": {
  "en": "Move to group",
  "es": "Mover a grupo"
 },
 "Criar grupo com esta imagem": {
  "en": "Create group with this image",
  "es": "Crear grupo con esta imagen"
 },
 "Excluir os grupos selecionados, todos os subgrupos e imagens descendentes? As outras Bibliotecas serão preservadas.": {
  "en": "Delete the selected groups and all descendant subgroups and images? Other Libraries will be kept.",
  "es": "¿Eliminar los grupos seleccionados y todos sus subgrupos e imágenes? Se conservarán las otras Bibliotecas."
 },
 "Excluir as imagens selecionadas?": {
  "en": "Delete the selected images?",
  "es": "¿Eliminar las imágenes seleccionadas?"
 },
 "Itens agrupados no ancestral comum mais próximo.": {
  "en": "Items grouped under their nearest common ancestor.",
  "es": "Elementos agrupados bajo su ancestro común más cercano."
 },
 "Backup JSON salvo.": {
  "en": "JSON backup saved.",
  "es": "Copia JSON guardada."
 },
 "Selecione um backup .json do ClickImage. Arquivos ZIP não são aceitos na importação.": {
  "en": "Select a ClickImage .json backup. ZIP files are not accepted for import.",
  "es": "Selecciona una copia .json de ClickImage. No se aceptan archivos ZIP para importar."
 },
 "O backup JSON aceita até 16 MB de imagens. Use ZIP para exportar coleções maiores.": {
  "en": "JSON backups support up to 16 MB of images. Use ZIP to export larger collections.",
  "es": "Las copias JSON admiten hasta 16 MB de imágenes. Usa ZIP para exportar colecciones mayores."
 },
 "Hierarquia inválida ou acima de 32 níveis.": {
  "en": "Invalid hierarchy or more than 32 levels.",
  "es": "Jerarquía inválida o de más de 32 niveles."
 },
 "Selecione itens para agrupar.": {
  "en": "Select items to group.",
  "es": "Selecciona elementos para agrupar."
 },
 "Escolha uma pasta para as imagens.": {
  "en": "Choose a folder for the images.",
  "es": "Elige una carpeta para las imágenes."
 },
 "Copiar grupos não está disponível. Use mover.": {
  "en": "Copying groups is unavailable. Use move.",
  "es": "No se pueden copiar grupos. Usa mover."
 },
 "Confirme a exclusão de todas as Bibliotecas.": {
  "en": "Confirm deletion of all Libraries.",
  "es": "Confirma la eliminación de todas las Bibliotecas."
 }
});
 const languages=['pt-BR','en','es'];let language='pt-BR';const listeners=new Set();
 function t(source,values={}){
  if(typeof source!=='string')return source || '';
  // Stored errors stay canonical; only presentation changes with the locale.
  const text=messages[source]?.[language] || source;
  return text.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
 }
 function error(source){
  if(typeof source!=='string')return '';
  const prefix='Nenhuma imagem pôde ser obtida para o ZIP.';
  if(source.startsWith(prefix+' '))return t(prefix)+' '+t(source.slice(prefix.length+1));
  return t(source);
 }
 function update(value){const next=languages.includes(value)?value:'pt-BR';if(next===language)return;language=next;for(const callback of listeners)callback(next)}
 async function setLanguage(value){
  update(value);
  try{await root.chrome?.storage?.local?.set({clickimageLanguage:language})}catch{throw new Error('Não foi possível salvar o idioma.')}
 }
 const originals=new WeakMap();
 const dynamic='#feedback,#batch-progress,#status-label,#count,#empty-title,#empty-description,#select,#download-all,.source,.dimensions,.item-status,.item-error,.download,.convert-png,#folder-title,#folders,#destination,#storage-usage,#folder-count,#library-feedback,#selection-count,#library-picker,.library-save-status';
 function apply(scope){
  if(!scope)return;
  const document=scope.ownerDocument || scope;
  const walker=document.createTreeWalker(scope,4);let node;
  while((node=walker.nextNode())){
   if(node.parentElement?.closest(dynamic))continue;
   const raw=originals.get(node) || node.nodeValue;
   const source=raw.trim();if(!Object.hasOwn(messages,source))continue;
   originals.set(node,raw);node.nodeValue=raw.replace(source,()=>t(source));
  }
  const nodes=[...(scope.querySelectorAll?.('[title],[aria-label],[alt]') || [])];
  if(scope.nodeType===1)nodes.unshift(scope);
  for(const el of nodes){
   if(el.closest('.gallery-entry'))continue;
   let attrs=originals.get(el);if(!attrs){attrs={};originals.set(el,attrs)}
   for(const name of ['title','aria-label','alt']){
    const source=attrs[name] || el.getAttribute(name);
    if(source && Object.hasOwn(messages,source)){attrs[name]=source;el.setAttribute(name,t(source))}
   }
  }
 }
 const api={t,error,apply,setLanguage,get language(){return language},languages,onChange:callback=>{listeners.add(callback);return()=>listeners.delete(callback)},messages};
 root.ClickImageI18n=api;
 api.ready=(async()=>{try{const value=await root.chrome?.storage?.local?.get('clickimageLanguage');update(value?.clickimageLanguage)}catch{}return language})();
 root.chrome?.storage?.onChanged?.addListener((changes,area)=>{if(area==='local' && changes.clickimageLanguage)update(changes.clickimageLanguage.newValue)});
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
